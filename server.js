// 天气显示页面 - 和风天气 API CORS 代理服务器
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 加载环境变量
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const QWEATHER_KEY = process.env.QWEATHER_KEY;
const QWEATHER_HOST = process.env.QWEATHER_HOST || 'jn5n8p6783.re.qweatherapi.com';

// 验证必需的环境变量
if (!QWEATHER_KEY) {
  console.error('错误: QWEATHER_KEY 未配置，请在 .env 文件中设置');
  process.exit(1);
}

// ===== 请求限流配置 =====
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟窗口
  max: 30, // 每分钟最多30次请求
  message: { code: '429', msg: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== 内存缓存配置 =====
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() < item.expire) {
    return item.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, expire: Date.now() + CACHE_TTL });
  // 清理过期缓存，防止内存无限增长
  if (cache.size > 200) {
    for (const [k, v] of cache) {
      if (Date.now() >= v.expire) cache.delete(k);
    }
  }
  // 如果清理后仍然过多，删除最早的条目
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

// ===== 输入验证 =====
function validateLocation(location) {
  // 和风天气location格式: 9位城市代码或经纬度
  if (!location) return false;
  const cityCodeRegex = /^\d{9}$/;
  const coordRegex = /^\d{1,3}\.\d+,\d{1,3}\.\d+$/;
  return cityCodeRegex.test(location) || coordRegex.test(location);
}

function sanitizeLocation(location) {
  if (!validateLocation(location)) {
    return null; // 无效则返回null，使用默认值
  }
  return location;
}

// ===== fetch超时工具 =====
async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return resp;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ===== 城市坐标映射 =====
const CITY_COORDS = {
  '101020100': { lat: 31.23, lon: 121.47, name: '上海' },
  '101010100': { lat: 39.90, lon: 116.40, name: '北京' },
  '101280101': { lat: 23.13, lon: 113.26, name: '广州' },
  '101280601': { lat: 22.54, lon: 114.06, name: '深圳' },
  '101210101': { lat: 30.27, lon: 120.15, name: '杭州' },
};

const DEFAULT_LOCATION = '101280601';

// 安全响应头（CSP关闭以兼容内联SVG和innerHTML）
app.use(helmet({ contentSecurityPolicy: false }));

// CORS配置（仅允许本地访问）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 静态资源
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny' }));

// API限流
app.use('/api/', apiLimiter);

// ===== 和风天气代理接口 =====
// 实况天气
app.get('/api/qweather/now', async (req, res) => {
  const rawLocation = req.query.location;
  const location = sanitizeLocation(rawLocation) || DEFAULT_LOCATION;
  const cacheKey = `now_${location}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const url = `https://${QWEATHER_HOST}/v7/weather/now?location=${encodeURIComponent(location)}&key=${QWEATHER_KEY}`;
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      return res.status(502).json({ code: '502', msg: '上游服务异常', status: resp.status });
    }
    const data = await resp.json();
    if (data.code === '200') {
      setCache(cacheKey, data);
    }
    res.json(data);
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : '上游请求失败';
    res.status(502).json({ code: '502', msg, detail: String(err) });
  }
});

// 7天预报
app.get('/api/qweather/7d', async (req, res) => {
  const rawLocation = req.query.location;
  const location = sanitizeLocation(rawLocation) || DEFAULT_LOCATION;
  const cacheKey = `7d_${location}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const url = `https://${QWEATHER_HOST}/v7/weather/7d?location=${encodeURIComponent(location)}&key=${QWEATHER_KEY}`;
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      return res.status(502).json({ code: '502', msg: '上游服务异常', status: resp.status });
    }
    const data = await resp.json();
    if (data.code === '200') {
      setCache(cacheKey, data);
    }
    res.json(data);
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : '上游请求失败';
    res.status(502).json({ code: '502', msg, detail: String(err) });
  }
});

// 逐小时预报（24小时）
app.get('/api/qweather/hourly', async (req, res) => {
  const rawLocation = req.query.location;
  const location = sanitizeLocation(rawLocation) || DEFAULT_LOCATION;
  const cacheKey = `hourly_${location}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const url = `https://${QWEATHER_HOST}/v7/weather/24h?location=${encodeURIComponent(location)}&key=${QWEATHER_KEY}`;
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      return res.status(502).json({ code: '502', msg: '上游服务异常', status: resp.status });
    }
    const data = await resp.json();
    if (data.code === '200') {
      setCache(cacheKey, data);
    }
    res.json(data);
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : '上游请求失败';
    res.status(502).json({ code: '502', msg, detail: String(err) });
  }
});

// 生活指数（当日）
app.get('/api/qweather/indices', async (req, res) => {
  const rawLocation = req.query.location;
  const location = sanitizeLocation(rawLocation) || DEFAULT_LOCATION;
  const rawType = req.query.type || '1,2,3,5,6,9,10,12';
  // 只允许数字和逗号，防止缓存键注入
  const type = /^\d(,\d)*$/.test(rawType) ? rawType : '1,2,3,5,6,9,10,12';
  const cacheKey = `indices_${location}_${type}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const url = `https://${QWEATHER_HOST}/v7/indices/1d?location=${encodeURIComponent(location)}&key=${QWEATHER_KEY}&type=${encodeURIComponent(type)}`;
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      return res.status(502).json({ code: '502', msg: '上游服务异常', status: resp.status });
    }
    const data = await resp.json();
    if (data.code === '200') {
      setCache(cacheKey, data);
    }
    res.json(data);
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : '上游请求失败';
    res.status(502).json({ code: '502', msg, detail: String(err) });
  }
});

// ===== 城市搜索接口（高德行政区划 API） =====
app.get('/api/geo/lookup', async (req, res) => {
  const keyword = (req.query.location || '').trim();
  if (!keyword || keyword.length < 2 || keyword.length > 20) {
    return res.json({ location: [] });
  }
  const cacheKey = `geo_${keyword}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const amapKey = process.env.AMAP_KEY;
  if (!amapKey) {
    return res.status(500).json({ code: '500', msg: 'AMAP_KEY 未配置' });
  }

  // subdistrict=1 返回下一级行政区划
  const url = `https://restapi.amap.com/v3/config/district?keywords=${encodeURIComponent(keyword)}&key=${amapKey}&subdistrict=1&offset=10&page=1`;
  try {
    const resp = await fetchWithTimeout(url);
    const data = await resp.json();

    if (data.status !== '1' || !Array.isArray(data.districts)) {
      return res.json({ location: [] });
    }

    // 扁平化：市级展开到区县，区县级不再展开
    const location = [];
    data.districts.forEach(d => {
      const [lon, lat] = (d.center || '0,0').split(',');
      location.push({
        name: d.name,
        id: d.adcode,
        lat: lat || '0',
        lon: lon || '0',
        adm1: '',
        adm2: d.name,
        level: d.level,
      });
      // 只有市级才展开下级区县
      if (d.level === 'city' && Array.isArray(d.districts)) {
        d.districts.forEach(sub => {
          const [sLon, sLat] = (sub.center || '0,0').split(',');
          location.push({
            name: sub.name,
            id: sub.adcode,
            lat: sLat || '0',
            lon: sLon || '0',
            adm1: d.name,
            adm2: sub.name,
            level: sub.level,
          });
        });
      }
    });

    const result = { code: '200', location };
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : '上游请求失败';
    res.status(502).json({ code: '502', msg, detail: String(err) });
  }
});

// ===== Open-Meteo 空气质量代理接口 =====
app.get('/api/air/now', async (req, res) => {
  const rawLocation = req.query.location;
  const location = sanitizeLocation(rawLocation) || DEFAULT_LOCATION;
  const lat = parseFloat(req.query.lat) || 0;
  const lon = parseFloat(req.query.lon) || 0;
  const coord = (lat && lon) ? { lat, lon } : (CITY_COORDS[location] || CITY_COORDS[DEFAULT_LOCATION]);
  const cacheKey = `air_${location}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coord.lat}&longitude=${coord.lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi`;
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      return res.status(502).json({ status: 'error', message: '上游服务异常', upstreamStatus: resp.status });
    }
    const data = await resp.json();
    if (data.current) {
      setCache(cacheKey, data);
    }
    res.json(data);
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : '上游请求失败';
    res.status(502).json({ status: 'error', message: msg, detail: String(err) });
  }
});

// ===== 和风天气预警代理接口 =====
app.get('/api/warning/current', async (req, res) => {
  const rawLocation = req.query.location;
  const location = sanitizeLocation(rawLocation) || DEFAULT_LOCATION;
  const lat = parseFloat(req.query.lat) || 0;
  const lon = parseFloat(req.query.lon) || 0;
  const coord = (lat && lon) ? { lat, lon } : (CITY_COORDS[location] || CITY_COORDS[DEFAULT_LOCATION]);
  const cacheKey = `warning_${location}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const url = `https://${QWEATHER_HOST}/weatheralert/v1/current/${coord.lat}/${coord.lon}?key=${QWEATHER_KEY}`;
  try {
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      return res.status(502).json({ code: '502', msg: '上游服务异常', status: resp.status });
    }
    const data = await resp.json();
    if (data.code === '200') {
      setCache(cacheKey, data);
    }
    res.json(data);
  } catch (err) {
    const msg = err.name === 'AbortError' ? '请求超时' : '上游请求失败';
    res.status(502).json({ code: '502', msg, detail: String(err) });
  }
});

// 室内传感器数据接口（占位，未来接DHT22传感器）
app.get('/api/indoor', (req, res) => {
  res.json({ temperature: null, humidity: null, source: 'placeholder' });
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`天气显示服务已启动: http://localhost:${PORT}`);
});