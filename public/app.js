// ===== 天气显示台 - 前端逻辑 =====
(function () {
  'use strict';

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }

  // ---------- 常量 ----------
  const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const WEEKDAYS_FULL = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const REFRESH_INTERVAL = 10 * 60 * 1000;
  const INDICES_TYPES = '1,2,3,5,6,9,10,12';
  const MAX_ALERTS = 9; // 预警显示上限

  // ---------- 动态背景粒子系统 ----------
  const ParticleSystem = (function () {
    let canvas, ctx;
    let particles = [];
    let animationId = null;
    let currentEffect = 'none';
    let currentTheme = null;
    let width = 0, height = 0;

    const RAIN_LEVELS = {
      light: { count: 60, speed: 5, length: 20, opacity: 0.6 },
      moderate: { count: 100, speed: 7, length: 28, opacity: 0.7 },
      heavy: { count: 180, speed: 10, length: 35, opacity: 0.8 }
    };

    const SNOW_LEVELS = {
      light: { count: 40, speed: 1.5, size: 5, opacity: 0.7 },
      moderate: { count: 80, speed: 2.5, size: 7, opacity: 0.8 },
      heavy: { count: 140, speed: 3.5, size: 9, opacity: 0.9 }
    };

    const SOLAR_LEVELS = {
      sunny: { count: 30, speed: 0.6, opacity: 0.5 },
      partly: { count: 15, speed: 0.4, opacity: 0.35 }
    };

    const FESTIVAL_THEMES = {
      spring: { colors: ['#22c55e', '#4ade80', '#16a34a', '#86efac'], particleType: 'mugwort' },
      lantern: { colors: ['#ef4444', '#f97316', '#fbbf24', '#ffffff'], particleType: 'lantern' },
      midautumn: { colors: ['#fbbf24', '#fcd34d', '#fde68a', '#ffffff'], particleType: 'moon' },
      christmas: { colors: ['#ef4444', '#22c55e', '#ffffff'], particleType: 'snowflake' },
      valentine: { colors: ['#ef4444', '#f472b6', '#ffffff'], particleType: 'heart' },
      national: { colors: ['#ef4444', '#fbbf24'], particleType: 'star' },
      tomb: { colors: ['#94a3b8', '#cbd5e1'], particleType: 'willow' }
    };

    function resize() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * (window.devicePixelRatio || 1);
      canvas.height = height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }

    function createRainParticle(level) {
      const cfg = RAIN_LEVELS[level] || RAIN_LEVELS.light;
      return {
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: cfg.speed + Math.random() * 2,
        length: cfg.length + Math.random() * 10,
        opacity: cfg.opacity + Math.random() * 0.2,
        angle: -0.4 + Math.random() * 0.2
      };
    }

    function createSnowParticle(level) {
      const cfg = SNOW_LEVELS[level] || SNOW_LEVELS.light;
      return {
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: cfg.speed + Math.random() * 1,
        size: cfg.size + Math.random() * 3,
        opacity: cfg.opacity + Math.random() * 0.2,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03
      };
    }

    function createSolarParticle(level) {
      const cfg = SOLAR_LEVELS[level] || SOLAR_LEVELS.sunny;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        speed: cfg.speed + Math.random() * 0.3,
        size: 2 + Math.random() * 4,
        opacity: cfg.opacity + Math.random() * 0.1,
        angle: Math.random() * Math.PI * 2
      };
    }

    function createFestivalParticle(theme) {
      const t = FESTIVAL_THEMES[theme];
      if (!t) return null;
      const colors = t.colors;
      const type = t.particleType;

      const particle = {
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: 0.5 + Math.random() * 1.5,
        size: 4 + Math.random() * 6,
        opacity: 0.7 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: type,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.05
      };
      return particle;
    }

    function drawRain(p) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      const endX = p.x + Math.sin(p.angle) * p.length;
      const endY = p.y + Math.cos(p.angle) * p.length;
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(147, 197, 253, ${p.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    function drawSnow(p) {
      ctx.beginPath();
      const spikes = 6;
      const outerRadius = p.size;
      const innerRadius = p.size * 0.4;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / spikes) * i + p.wobble * 0.5;
        const x = p.x + Math.cos(angle) * r;
        const y = p.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.fill();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 3;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawSolar(p) {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gradient.addColorStop(0, `rgba(251, 191, 36, ${p.opacity})`);
      gradient.addColorStop(0.5, `rgba(251, 191, 36, ${p.opacity * 0.5})`);
      gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    function drawFestival(p) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;

      if (p.type === 'mugwort') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.wobble);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.5, p.size * 0.6, 0, p.size * 0.4, p.size * 0.3);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.4, p.size * 0.3);
        ctx.bezierCurveTo(-p.size * 0.6, 0, -p.size * 0.8, -p.size * 0.5, 0, -p.size);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 0.3);
        ctx.lineTo(0, p.size * 0.3);
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'lantern') {
        ctx.beginPath();
        ctx.roundRect(p.x - p.size * 0.6, p.y - p.size, p.size * 1.2, p.size * 1.8, p.size * 0.3);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y + p.size * 0.8, p.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'moon') {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, '#fde68a');
        gradient.addColorStop(1, '#fbbf24');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else if (p.type === 'snowflake') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          ctx.moveTo(p.x, p.y);
          const angle = (Math.PI / 3) * i;
          ctx.lineTo(p.x + Math.cos(angle) * p.size, p.y + Math.sin(angle) * p.size);
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (p.type === 'heart') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + p.size * 0.3);
        ctx.bezierCurveTo(p.x - p.size, p.y - p.size * 0.2, p.x - p.size * 0.8, p.y, p.x, p.y + p.size * 0.5);
        ctx.bezierCurveTo(p.x + p.size * 0.8, p.y, p.x + p.size, p.y - p.size * 0.2, p.x, p.y + p.size * 0.3);
        ctx.fill();
      } else if (p.type === 'star') {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const outerAngle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          const innerAngle = outerAngle + Math.PI / 5;
          const x1 = p.x + Math.cos(outerAngle) * p.size;
          const y1 = p.y + Math.sin(outerAngle) * p.size;
          const x2 = p.x + Math.cos(innerAngle) * p.size * 0.4;
          const y2 = p.y + Math.sin(innerAngle) * p.size * 0.4;
          if (i === 0) ctx.moveTo(x1, y1);
          else ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'willow') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo(p.x + Math.sin(p.wobble) * p.size, p.y + p.size * 0.5, p.x, p.y + p.size);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    function updateRain(p) {
      p.x += Math.sin(p.angle) * p.speed * 0.3;
      p.y += Math.cos(p.angle) * p.speed;
      if (p.y > height + p.length) {
        p.y = -p.length;
        p.x = Math.random() * width;
      }
    }

    function updateSnow(p) {
      p.y += p.speed;
      p.x += Math.sin(p.wobble) * 0.5;
      p.wobble += p.wobbleSpeed;
      if (p.y > height + p.size) {
        p.y = -p.size;
        p.x = Math.random() * width;
      }
    }

    function updateSolar(p) {
      p.y -= p.speed;
      p.angle += 0.02;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
    }

    function updateFestival(p) {
      p.y += p.speed;
      p.x += Math.sin(p.wobble) * 0.3;
      p.wobble += p.wobbleSpeed;
      p.opacity = Math.max(0.2, p.opacity + (Math.random() - 0.5) * 0.02);
      if (p.y > height + p.size) {
        p.y = -p.size;
        p.x = Math.random() * width;
      }
    }

    function clear() {
      ctx.clearRect(0, 0, width, height);
    }

    function animate() {
      clear();

      particles.forEach(p => {
        if (currentEffect === 'rain') {
          drawRain(p);
          updateRain(p);
        } else if (currentEffect === 'snow') {
          drawSnow(p);
          updateSnow(p);
        } else if (currentEffect === 'solar') {
          drawSolar(p);
          updateSolar(p);
        } else if (currentEffect === 'festival') {
          drawFestival(p);
          updateFestival(p);
        }
      });

      animationId = requestAnimationFrame(animate);
    }

    function initParticles(effect, param) {
      particles = [];

      if (effect === 'rain') {
        const level = param || 'light';
        const count = RAIN_LEVELS[level].count;
        for (let i = 0; i < count; i++) {
          particles.push(createRainParticle(level));
        }
      } else if (effect === 'snow') {
        const level = param || 'light';
        const count = SNOW_LEVELS[level].count;
        for (let i = 0; i < count; i++) {
          particles.push(createSnowParticle(level));
        }
      } else if (effect === 'solar') {
        const level = param || 'sunny';
        const count = SOLAR_LEVELS[level].count;
        for (let i = 0; i < count; i++) {
          particles.push(createSolarParticle(level));
        }
      } else if (effect === 'festival') {
        const theme = param || 'spring';
        const count = 50;
        for (let i = 0; i < count; i++) {
          const p = createFestivalParticle(theme);
          if (p) particles.push(p);
        }
      }
    }

    function setEffect(effect, param) {
      if (currentEffect === effect && (!param || currentTheme === param)) return;
      currentEffect = effect;
      currentTheme = param;
      if (effect === 'none' || effect === null) {
        stop();
      } else {
        initParticles(effect, param);
        if (!animationId) animate();
      }
    }

    function stop() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      particles = [];
      clear();
    }

    function init() {
      canvas = document.getElementById('bgCanvas');
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
      animate();
    }

    return {
      init,
      setEffect,
      stop
    };
  })();
  const WEATHER_EFFECT_MAP = {
    '小雨': { effect: 'rain', level: 'light' },
    '中雨': { effect: 'rain', level: 'light' },
    '大雨': { effect: 'rain', level: 'light' },
    '暴雨': { effect: 'rain', level: 'light' },
    '雷阵雨': { effect: 'rain', level: 'light' },
    '雷阵雨伴有冰雹': { effect: 'rain', level: 'light' },
    '冻雨': { effect: 'rain', level: 'light' },
    '阵雨': { effect: 'rain', level: 'light' },
    '小雪': { effect: 'snow', level: 'light' },
    '中雪': { effect: 'snow', level: 'light' },
    '大雪': { effect: 'snow', level: 'light' },
    '暴雪': { effect: 'snow', level: 'light' },
    '雨夹雪': { effect: 'snow', level: 'light' },
    '晴': { effect: 'solar', level: 'sunny' },
    '少云': { effect: 'solar', level: 'partly' },
    '多云': { effect: 'solar', level: 'partly' },
    '晴间多云': { effect: 'solar', level: 'partly' },
};

const FESTIVAL_DATA = {
    '1-1': { name: '元旦', theme: 'lantern' },
    '2-14': { name: '情人节', theme: 'valentine' },
    '2-17': { name: '春节', theme: 'lantern' },
    '2-18': { name: '春节', theme: 'lantern' },
    '2-19': { name: '春节', theme: 'lantern' },
    '2-20': { name: '春节', theme: 'lantern' },
    '2-21': { name: '春节', theme: 'lantern' },
    '2-22': { name: '春节', theme: 'lantern' },
    '2-23': { name: '春节', theme: 'lantern' },
    '4-4': { name: '清明', theme: 'tomb' },
    '4-5': { name: '清明', theme: 'tomb' },
    '4-6': { name: '清明', theme: 'tomb' },
    '5-1': { name: '劳动节', theme: 'national' },
    '5-2': { name: '劳动节', theme: 'national' },
    '5-3': { name: '劳动节', theme: 'national' },
    '5-4': { name: '劳动节', theme: 'national' },
    '5-5': { name: '劳动节', theme: 'national' },
    '5-31': { name: '端午', theme: 'spring' },
    '6-1': { name: '端午', theme: 'spring' },
    '6-2': { name: '端午', theme: 'spring' },
    '10-1': { name: '国庆', theme: 'national' },
    '10-2': { name: '国庆', theme: 'national' },
    '10-3': { name: '国庆', theme: 'national' },
    '10-4': { name: '国庆', theme: 'national' },
    '10-5': { name: '国庆', theme: 'national' },
    '10-6': { name: '国庆', theme: 'national' },
    '10-7': { name: '国庆', theme: 'national' },
    '10-8': { name: '国庆', theme: 'national' },
    '12-25': { name: '圣诞节', theme: 'christmas' },
};

const SOLAR_TERMS = {
    '3-5': '惊蛰', '3-6': '惊蛰', '3-7': '惊蛰',
    '3-20': '春分', '3-21': '春分', '3-22': '春分',
    '4-4': '清明', '4-5': '清明', '4-6': '清明',
    '4-19': '谷雨', '4-20': '谷雨', '4-21': '谷雨',
    '5-5': '立夏', '5-6': '立夏', '5-7': '立夏',
    '5-20': '小满', '5-21': '小满', '5-22': '小满',
    '6-5': '芒种', '6-6': '芒种', '6-7': '芒种',
    '6-21': '夏至', '6-22': '夏至',
    '7-6': '小暑', '7-7': '小暑', '7-8': '小暑',
    '7-22': '大暑', '7-23': '大暑', '7-24': '大暑',
    '8-7': '立秋', '8-8': '立秋', '8-9': '立秋',
    '8-22': '处暑', '8-23': '处暑', '8-24': '处暑',
    '9-7': '白露', '9-8': '白露', '9-9': '白露',
    '9-22': '秋分', '9-23': '秋分', '9-24': '秋分',
    '10-8': '寒露', '10-9': '寒露', '10-10': '寒露',
    '10-23': '霜降', '10-24': '霜降', '10-25': '霜降',
    '11-7': '立冬', '11-8': '立冬', '11-9': '立冬',
    '11-22': '小雪', '11-23': '小雪', '11-24': '小雪',
    '12-6': '大雪', '12-7': '大雪', '12-8': '大雪',
    '12-21': '冬至', '12-22': '冬至',
    '1-5': '小寒', '1-6': '小寒', '1-7': '小寒',
    '1-20': '大寒', '1-21': '大寒', '1-22': '大寒',
    '2-3': '立春', '2-4': '立春', '2-5': '立春',
    '2-18': '雨水', '2-19': '雨水', '2-20': '雨水',
};

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const els = {
    timeHM: $('timeHM'), timeSS: $('timeSS'),
    solarDate: $('solarDate'), weekday: $('weekday'),
    lunarDate: $('lunarDate'), ganzhi: $('ganzhi'),
    updateMeta: $('updateMeta'),
    cityInput: $('cityInput'), cityDropdown: $('cityDropdown'),
    todayTemp: $('todayTemp'),
    todayIcon: $('todayIcon'), todayWeather: $('todayWeather'),
    todayLocation: $('todayLocation'),
    todayFeels: $('todayFeels'),
    todayDayTemp: $('todayDayTemp'), todayNightTemp: $('todayNightTemp'),
    sunrise: $('sunrise'), sunset: $('sunset'),
    todayHumidity: $('todayHumidity'), todayPressure: $('todayPressure'),
    todayVis: $('todayVis'), todayWind: $('todayWind'),
    idxCloth: $('idxCloth'), idxCar: $('idxCar'), idxSport: $('idxSport'),
    idxUv: $('idxUv'), idxCold: $('idxCold'), idxTravel: $('idxTravel'),
    airAqi: $('airAqi'), airLevel: $('airLevel'),
    airPm25: $('airPm25'), airPm10: $('airPm10'), airNo2: $('airNo2'), airO3: $('airO3'),
    airSo2: $('airSo2'), airCo: $('airCo'),
    yesterdaySub: $('yesterdaySub'), yesterdayIcon: $('yesterdayIcon'),
    yesterdayWeather: $('yesterdayWeather'),
    yesterdayDayTemp: $('yesterdayDayTemp'), yesterdayNightTemp: $('yesterdayNightTemp'),
    tomorrowSub: $('tomorrowSub'), tomorrowIcon: $('tomorrowIcon'),
    tomorrowWeather: $('tomorrowWeather'),
    tomorrowDayTemp: $('tomorrowDayTemp'), tomorrowNightTemp: $('tomorrowNightTemp'),
    tomorrowTrend: $('tomorrowTrend'),
    day3Sub: $('day3Sub'), day3Icon: $('day3Icon'),
    day3Weather: $('day3Weather'),
    day3DayTemp: $('day3DayTemp'), day3NightTemp: $('day3NightTemp'),
    day3Trend: $('day3Trend'),
    alertList: $('alertList'),
    summaryTip: $('summaryTip'),
    fullscreenBtn: $('fullscreenBtn'),
    holidayTag: $('holidayTag'),
    solarTerm: $('solarTerm'),
    hourlyScroll: $('hourlyScroll'),
  };

  let currentLocation = '101280601';
  let currentCityInfo = { id: '101280601', name: '深圳', lat: 22.54, lon: 114.06 };
  let requestVersion = 0;
  let searchVersion = 0;
  let currentObsText = '';
  let searchDebounceTimer = null;
  let activeDropdownIndex = -1;

  // ---------- 安全解析工具 ----------
  function safeParseInt(val, defaultVal = 0) {
    const n = parseInt(val, 10);
    return isNaN(n) ? defaultVal : n;
  }

  function safeParseFloat(val, defaultVal = 0) {
    const n = parseFloat(val);
    return isNaN(n) ? defaultVal : n;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---------- 时钟与日期 ----------
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function updateClock() {
    const now = new Date();
    els.timeHM.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
    els.timeSS.textContent = pad(now.getSeconds());
  }

  function updateDate() {
    const now = new Date();
    els.solarDate.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    els.weekday.textContent = WEEKDAYS_FULL[(now.getDay() + 6) % 7];

    const dateKey = `${now.getMonth() + 1}-${now.getDate()}`;
    const solarTerm = SOLAR_TERMS[dateKey];

    try {
      if (window.Lunar && window.Solar) {
        const solar = Solar.fromDate(now);
        const lunar = solar.getLunar();
        const monthCn = lunar.getMonthInChinese();
        const dayCn = lunar.getDayInChinese();
        const gz = lunar.getYearInGanZhi();
        const sx = lunar.getYearShengXiao();
        els.lunarDate.textContent = `农历 ${monthCn}月${dayCn}`;
        els.ganzhi.textContent = `${gz}年 · ${sx}`;
      } else {
        els.lunarDate.textContent = '农历 …';
        els.ganzhi.textContent = '— — 年';
      }
    } catch (e) {
      els.lunarDate.textContent = '农历 …';
      els.ganzhi.textContent = '— — 年';
    }

    if (els.solarTerm) {
      els.solarTerm.textContent = solarTerm ? `🌿 ${solarTerm}` : '';
      els.solarTerm.style.display = solarTerm ? 'inline' : 'none';
    }
  }

  // ---------- 天气图标（内联 SVG） ----------
  function iconFor(weather) {
    if (!weather || typeof weather !== 'string') return '';
    const w = weather.replace(/[<>"/&]/g, '');
    const stroke = 'currentColor';
    const sun = `<circle cx="12" cy="12" r="4.2" fill="none" stroke="${stroke}" stroke-width="1.5"/>`;
    const sunRays = `<g stroke="${stroke}" stroke-width="1.5" stroke-linecap="round">
      <line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/>
      <line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/>
      <line x1="5.2" y1="5.2" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="18.8" y2="18.8"/>
      <line x1="5.2" y1="18.8" x2="6.9" y2="17.1"/><line x1="17.1" y1="6.9" x2="18.8" y2="5.2"/></g>`;
    const cloud = `<path d="M6.5 16h10a3.2 3.2 0 0 0 .3-6.4 4.5 4.5 0 0 0-8.7-1.2A3.4 3.4 0 0 0 6.5 16z" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/>`;
    const rainDrops = `<g stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" fill="none">
      <line x1="9" y1="19" x2="8" y2="21.5"/><line x1="13" y1="19" x2="12" y2="21.5"/><line x1="17" y1="19" x2="16" y2="21.5"/></g>`;
    const bolt = `<path d="M12 18l-2 4h3l-1 3 4-5h-3l1-2z" fill="${stroke}" stroke="none"/>`;
    const snowFlakes = `<g stroke="${stroke}" stroke-width="1.4" stroke-linecap="round" fill="none">
      <line x1="9" y1="20" x2="9" y2="21.5"/><line x1="13" y1="20" x2="13" y2="21.5"/><line x1="17" y1="20" x2="17" y2="21.5"/>
      <line x1="8.5" y1="20.6" x2="9.5" y2="20.9"/><line x1="12.5" y1="20.6" x2="13.5" y2="20.9"/><line x1="16.5" y1="20.6" x2="17.5" y2="20.9"/></g>`;
    const fog = `<g stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" fill="none">
      <line x1="5" y1="14" x2="19" y2="14"/><line x1="6" y1="17" x2="18" y2="17"/><line x1="8" y1="20" x2="16" y2="20"/></g>`;

    let inner = '';
    if (w.indexOf('雷') >= 0) inner = cloud + bolt;
    else if (w.indexOf('雪') >= 0 || w.indexOf('冰') >= 0) inner = cloud + snowFlakes;
    else if (w.indexOf('雨') >= 0) inner = cloud + rainDrops;
    else if (w.indexOf('雾') >= 0 || w.indexOf('霾') >= 0 || w.indexOf('沙') >= 0) inner = cloud + fog;
    else if (w.indexOf('阴') >= 0) inner = cloud;
    else if (w.indexOf('多云') >= 0) inner = sunRays + cloud;
    else inner = sun + sunRays;

    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  }

  // ---------- 工具 ----------
  function dateOffset(dateStr, deltaDays) {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr; // 日期无效则返回原值
    d.setDate(d.getDate() + deltaDays);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    return `${y}-${m}-${dd}`;
  }

  function shortDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '—';
    const p = dateStr.split('-');
    if (p.length < 3) return dateStr;
    const month = safeParseInt(p[1], 1);
    const day = safeParseInt(p[2], 1);
    return `${month}月${day}日`;
  }

  function weekDayFromDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return WEEKDAYS[(d.getDay() + 6) % 7];
  }

  function truncateText(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '…';
  }

  function simplifyAlertText(text) {
    if (!text) return '';
    // 剥离"xxx气象台发布"、"xxx气象局发布"等发布机构前缀
    let s = text.replace(/^.+?(气象台|气象局|气象中心|预警中心|三防办|应急办|海事局).*?发布(的)?/, '');
    // 剥离"xxx省/市/区...发布"前缀
    s = s.replace(/^.+?[省市县区].+?发布(的)?/, '');
    // 剥离直接的地名前缀（无"发布"字样），如"中心城区"、"深圳市"、"广东省深圳市"等
    s = s.replace(/^(?:[\u4e00-\u9fa5]+?(?:城区|开发区|新区|地区|市辖区|市|区|县|省|镇))+/, '');
    // 剥离"信号"后缀
    s = s.replace(/信号$/, '');
    // 简化常见预警类型
    s = s.replace(/城市内涝风险/, '内涝');
    s = s.replace(/山洪灾害/, '山洪');
    s = s.replace(/地质灾害/, '地质');
    s = s.replace(/森林火险/, '火险');
    s = s.replace(/道路结冰/, '结冰');
    s = s.replace(/沙尘暴/, '沙尘');
    s = s.replace(/雷雨大风/, '雷暴');
    // 去掉首尾空格
    s = s.trim();
    return s || text;
  }

  // ---------- 昨日缓存 ----------
  function cacheKey(dateStr) { return 'qweather_' + dateStr; }

  function saveTodayCache(daily) {
    if (!daily || !daily.fxDate) return;
    try {
      localStorage.setItem(cacheKey(daily.fxDate), JSON.stringify({
        date: daily.fxDate,
        dayWeather: daily.textDay, nightWeather: daily.textNight,
        dayTemp: daily.tempMax, nightTemp: daily.tempMin,
        dayWind: daily.windDirDay, dayScale: daily.windScaleDay,
      }));
    } catch (e) {
      // localStorage quota exceeded 或其他错误，静默处理
      console.warn('缓存保存失败:', e.message);
    }
  }

  function readCache(dateStr) {
    try {
      const raw = localStorage.getItem(cacheKey(dateStr));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('缓存读取失败:', e.message);
      return null;
    }
  }

  // ---------- fetch超时工具 ----------
  async function fetchWithTimeout(url, timeout = 10000) {
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

  // ---------- 和风天气获取 ----------
  async function fetchQWeatherNow(location) {
    try {
      const resp = await fetchWithTimeout(`/api/qweather/now?location=${encodeURIComponent(location)}`);
      return resp.json();
    } catch (err) {
      return { code: 'error', msg: err.name === 'AbortError' ? '请求超时' : '网络错误' };
    }
  }

  async function fetchQWeather7d(location) {
    try {
      const resp = await fetchWithTimeout(`/api/qweather/7d?location=${encodeURIComponent(location)}`);
      return resp.json();
    } catch (err) {
      return { code: 'error', msg: err.name === 'AbortError' ? '请求超时' : '网络错误' };
    }
  }

  async function fetchQWeatherIndices(location) {
    try {
      const resp = await fetchWithTimeout(`/api/qweather/indices?location=${encodeURIComponent(location)}&type=${INDICES_TYPES}`);
      return resp.json();
    } catch (err) {
      return { code: 'error', msg: err.name === 'AbortError' ? '请求超时' : '网络错误' };
    }
  }

  async function fetchQWeatherHourly(location) {
    try {
      const resp = await fetchWithTimeout(`/api/qweather/hourly?location=${encodeURIComponent(location)}`);
      return resp.json();
    } catch (err) {
      return { code: 'error', msg: err.name === 'AbortError' ? '请求超时' : '网络错误' };
    }
  }

  async function fetchAirQuality(location) {
    try {
      const coords = `&lat=${currentCityInfo.lat}&lon=${currentCityInfo.lon}`;
      const resp = await fetchWithTimeout(`/api/air/now?location=${encodeURIComponent(location)}${coords}`);
      return resp.json();
    } catch (err) {
      return { error: true, message: err.name === 'AbortError' ? '请求超时' : '网络错误' };
    }
  }

  async function fetchWarning(location) {
    try {
      const coords = `&lat=${currentCityInfo.lat}&lon=${currentCityInfo.lon}`;
      const resp = await fetchWithTimeout(`/api/warning/current?location=${encodeURIComponent(location)}${coords}`);
      return resp.json();
    } catch (err) {
      return { alerts: [] };
    }
  }

  // ---------- 渲染：空气质量 ----------
  function renderAirQuality(data) {
    const gauge = document.getElementById('aqiGauge');
    if (!data || !data.current) {
      els.airAqi.textContent = '--';
      els.airLevel.textContent = '暂无数据';
      els.airLevel.className = 'air-level';
      els.airAqi.className = 'air-val';
      els.airPm25.textContent = '—';
      els.airPm10.textContent = '—';
      els.airNo2.textContent = '—';
      els.airO3.textContent = '—';
      els.airSo2.textContent = '—';
      els.airCo.textContent = '—';
      if (gauge) gauge.style.setProperty('--aqi-pct', '0%');
      return;
    }

    const c = data.current;
    const aqi = c.us_aqi;
    const aqiNum = aqi != null && aqi !== '' ? safeParseFloat(aqi) : null;
    els.airAqi.textContent = aqiNum != null ? Math.round(aqiNum) : '--';
    els.airAqi.className = 'air-val';

    const levelInfo = aqiNum != null ? getAqiLevel(aqiNum) : { text: '—', cls: '' };
    els.airLevel.textContent = levelInfo.text;
    els.airLevel.className = 'air-level ' + levelInfo.cls;
    els.airAqi.classList.add(levelInfo.cls);

    // 更新 AQI 仪表进度条
    if (gauge) {
      const pct = aqiNum != null ? Math.min((aqiNum / 500) * 100, 100) : 0;
      gauge.style.setProperty('--aqi-pct', pct.toFixed(1) + '%');
    }

    els.airPm25.textContent = c.pm2_5 != null ? safeParseFloat(c.pm2_5).toFixed(0) : '—';
    els.airPm10.textContent = c.pm10 != null ? safeParseFloat(c.pm10).toFixed(0) : '—';
    els.airNo2.textContent = c.nitrogen_dioxide != null ? safeParseFloat(c.nitrogen_dioxide).toFixed(0) : '—';
    els.airO3.textContent = c.ozone != null ? safeParseFloat(c.ozone).toFixed(0) : '—';
    els.airSo2.textContent = c.sulphur_dioxide != null ? safeParseFloat(c.sulphur_dioxide).toFixed(0) : '—';
    els.airCo.textContent = c.carbon_monoxide != null ? safeParseFloat(c.carbon_monoxide).toFixed(0) : '—';
  }

  function getAqiLevel(aqi) {
    const val = safeParseFloat(aqi, -1);
    if (val < 0) return { text: '—', cls: '' };
    if (val <= 50) return { text: '优', cls: 'aqi-good' };
    if (val <= 100) return { text: '良', cls: 'aqi-moderate' };
    if (val <= 150) return { text: '轻度污染', cls: 'aqi-unhealthy-s' };
    if (val <= 200) return { text: '中度污染', cls: 'aqi-unhealthy' };
    if (val <= 300) return { text: '重度污染', cls: 'aqi-very-unhealthy' };
    return { text: '严重污染', cls: 'aqi-hazardous' };
  }

  // ---------- 渲染：今日 ----------
  function renderToday(now, todayDaily) {
    const locLabel = currentCityInfo.level === 'district' && currentCityInfo.adm1
      ? `${currentCityInfo.adm1}${currentCityInfo.name}`
      : currentCityInfo.name || '—';
    els.todayLocation.textContent = locLabel;
    scaleTodayCity();

    if (now) {
      els.todayTemp.textContent = now.temp || '--';
      els.todayWeather.textContent = now.text || '—';
      els.todayIcon.innerHTML = iconFor(now.text || '');
      currentObsText = now.text || '';
      if (now.temp) {
        const t = safeParseInt(now.temp);
        const tInfo = getTempLevel(t);
        els.todayTemp.className = 'today-temp ' + tInfo.cls;
      }
      if (now.feelsLike) {
        els.todayFeels.textContent = `${now.feelsLike}°`;
        const f = safeParseInt(now.feelsLike);
        const fInfo = getTempLevel(f);
        els.todayFeels.className = 'today-feels ' + fInfo.cls;
      }
    }

    if (todayDaily) {
      els.todayDayTemp.textContent = (todayDaily.tempMax || '--') + '°';
      els.todayNightTemp.textContent = (todayDaily.tempMin || '--') + '°';
      if (todayDaily.tempMax) {
        const t = safeParseInt(todayDaily.tempMax);
        const tInfo = getTempLevel(t);
        els.todayDayTemp.className = 'gc-value ' + tInfo.cls;
      }
      if (todayDaily.tempMin) {
        const t = safeParseInt(todayDaily.tempMin);
        const tInfo = getTempLevel(t);
        els.todayNightTemp.className = 'gc-value ' + tInfo.cls;
      }
      els.sunrise.textContent = todayDaily.sunrise || '--:--';
      els.sunset.textContent = todayDaily.sunset || '--:--';
    }

    if (now) {
      renderHumidity(now.humidity);
      els.todayPressure.textContent = now.pressure ? now.pressure + ' hPa' : '—';
      els.todayVis.textContent = now.vis ? now.vis + ' km' : '—';
      const wind = [now.windDir, now.windScale ? now.windScale + '级' : ''].filter(Boolean).join(' ');
      els.todayWind.textContent = wind || '—';
    } else if (todayDaily) {
      renderHumidity(todayDaily.humidity);
      els.todayPressure.textContent = todayDaily.pressure ? todayDaily.pressure + ' hPa' : '—';
      els.todayVis.textContent = todayDaily.vis ? todayDaily.vis + ' km' : '—';
      const wind = [todayDaily.windDirDay, todayDaily.windScaleDay ? todayDaily.windScaleDay + '级' : ''].filter(Boolean).join(' ');
      els.todayWind.textContent = wind || '—';
    }
  }

  function renderHumidity(humidity) {
    if (!humidity) {
      els.todayHumidity.textContent = '—';
      els.todayHumidity.className = 'gc-value stat-humidity';
      return;
    }
    const h = safeParseInt(humidity);
    const info = getHumidityLevel(h);
    els.todayHumidity.textContent = h + '% ' + info.text;
    els.todayHumidity.className = 'gc-value stat-humidity ' + info.cls;
  }

  function getHumidityLevel(h) {
    if (h < 30) return { text: '干燥', cls: 'humidity-dry' };
    if (h < 40) return { text: '偏干', cls: 'humidity-dry-s' };
    if (h <= 65) return { text: '舒适', cls: 'humidity-comfort' };
    if (h <= 80) return { text: '偏潮', cls: 'humidity-moist' };
    return { text: '潮湿', cls: 'humidity-wet' };
  }

  function getTempLevel(t) {
    if (t < 10) return { text: '寒冷', cls: 'temp-cold' };
    if (t < 18) return { text: '凉爽', cls: 'temp-cool' };
    if (t < 26) return { text: '舒适', cls: 'temp-comfort' };
    if (t < 32) return { text: '温暖', cls: 'temp-warm' };
    if (t < 37) return { text: '炎热', cls: 'temp-hot' };
    return { text: '酷热', cls: 'temp-very-hot' };
  }

  // ---------- 渲染：生活指数 ----------
  function renderIndices(daily) {
    if (!daily || !Array.isArray(daily) || daily.length === 0) {
      [els.idxCloth, els.idxCar, els.idxSport, els.idxUv, els.idxCold, els.idxTravel].forEach(el => {
        el.textContent = '—';
        el.className = 'gc-value idx-level';
      });
      return;
    }

    const idxMap = {};
    daily.forEach(d => { idxMap[d.type] = d; });

    const setIdx = (el, type, goodLevel) => {
      const item = idxMap[type];
      if (item && item.category) {
        el.textContent = item.category;
        el.className = 'gc-value idx-level';
        const lvl = safeParseInt(item.level);
        if (!isNaN(lvl)) {
          if (lvl <= goodLevel) el.classList.add('good');
          else if (lvl <= goodLevel + 2) el.classList.add('mid');
          else el.classList.add('bad');
        }
        el.title = item.text || item.category;
      } else {
        el.textContent = '—';
        el.className = 'gc-value idx-level';
      }
    };

    setIdx(els.idxCloth, '3', 4);
    setIdx(els.idxCar, '2', 2);
    setIdx(els.idxSport, '1', 2);
    setIdx(els.idxUv, '5', 2);
    setIdx(els.idxCold, '9', 2);
    setIdx(els.idxTravel, '6', 2);
  }

  // ---------- 出行一句话总结 ----------
  function renderSummary(now, todayDaily, hourlyRes, indicesDaily, warnRes) {
    if (!els.summaryTip) return;
    const parts = [];

    // 1. 预警优先（最高优先级）
    if (warnRes && warnRes.alerts && warnRes.alerts.length > 0) {
      const headlines = warnRes.alerts.slice(0, 2).map(a => {
        const s = simplifyAlertText(a.headline || a.title || '');
        return s.replace(/预警$/, ''); // 去掉末尾"预警"两字，更简洁
      });
      if (headlines.length > 0) {
        parts.push(headlines.join('，') + '，注意防范');
      }
    }

    // 2. 降水（基于逐小时数据，看未来6小时）
    if (!parts.length && hourlyRes && Array.isArray(hourlyRes.hourly)) {
      const nowHour = new Date().getHours();
      const next6 = hourlyRes.hourly.filter(h => {
        const hr = parseInt((h.fxTime || '').split('T')[1] || '0');
        return hr >= nowHour && hr <= nowHour + 6;
      });
      const hasRain = next6.some(h => {
        const t = (h.text || '').toLowerCase();
        return t.includes('雨') || t.includes('雷') || t.includes('雪');
      });
      if (hasRain) {
        // 找到降水开始和结束时间
        const rainyHours = next6.filter(h => {
          const t = (h.text || '').toLowerCase();
          return t.includes('雨') || t.includes('雷') || t.includes('雪');
        });
        const rainTypes = new Set(rainyHours.map(h => h.text || ''));
        const typeStr = rainTypes.size === 1 ? [...rainTypes][0] : '降水';
        const maxPop = Math.max(...rainyHours.map(h => safeParseInt(h.pop)));
        const popStr = maxPop > 60 ? '，降水概率大' : '';
        parts.push(`${typeStr}${popStr}，记得带伞`);
      }
    }

    // 3. 高温/低温
    if (!parts.length && todayDaily) {
      const tMax = safeParseInt(todayDaily.tempMax);
      const tMin = safeParseInt(todayDaily.tempMin);
      if (tMax >= 35) {
        parts.push(`高温 ${tMax}°，注意防暑${tMax >= 37 ? '降温' : ''}`);
      } else if (tMax >= 32) {
        parts.push(`${tMax}° 较热，注意防晒`);
      } else if (tMin <= 5) {
        parts.push(`低温 ${tMin}°，注意保暖`);
      } else if (tMin <= 10) {
        parts.push(`最低 ${tMin}°，早晚偏凉`);
      }
    }

    // 4. 空气质量
    if (!parts.length && els.airAqi) {
      const aqiText = els.airAqi.textContent;
      const aqiNum = safeParseInt(aqiText, -1);
      if (aqiNum > 0 && aqiNum <= 50) {
        parts.push('空气质量优，适宜户外活动');
      } else if (aqiNum > 150) {
        parts.push('空气较差，减少户外活动');
      }
    }

    // 5. 基于生活指数的通用建议
    if (!parts.length && indicesDaily && Array.isArray(indicesDaily)) {
      const idxMap = {};
      indicesDaily.forEach(d => { idxMap[d.type] = d; });
      const uv = idxMap['5'];
      const sport = idxMap['1'];
      const travel = idxMap['6'];
      if (uv && safeParseInt(uv.level) >= 5) {
        parts.push('紫外线强，外出做好防晒');
      } else if (sport && safeParseInt(sport.level) >= 5) {
        parts.push('不宜户外运动');
      } else if (travel && safeParseInt(travel.level) <= 2) {
        parts.push('天气不错，适合出行');
      }
    }

    // 6. 兜底：天气描述 + 温度体感
    if (!parts.length) {
      const text = now?.text || todayDaily?.textDay || '';
      const temp = now ? safeParseInt(now.temp) : (todayDaily ? safeParseInt(todayDaily.tempMax) : 0);
      if (text) {
        const tInfo = getTempLevel(temp);
        parts.push(`${text}，${tInfo.text}`);
      }
    }

    els.summaryTip.textContent = parts.length > 0 ? parts[0] : '';
    els.summaryTip.classList.toggle('hidden', !parts.length);
    if (parts.length > 0) {
      scaleSummaryTip();
    }
  }

  function scaleTodayCity() {
    const el = els.todayLocation;
    if (!el) return;
    const container = el.parentElement;
    if (!container) return;
    const style = window.getComputedStyle(el);
    const containerWidth = container.clientWidth;
    if (containerWidth === 0) return;
    const minFontSize = 10;
    let fontSize = 14;
    let textWidth;
    do {
      const span = document.createElement('span');
      span.textContent = el.textContent;
      span.style.fontSize = fontSize + 'px';
      span.style.fontFamily = style.fontFamily;
      span.style.fontWeight = style.fontWeight;
      span.style.letterSpacing = style.letterSpacing;
      span.style.position = 'absolute';
      span.style.visibility = 'hidden';
      span.style.whiteSpace = 'nowrap';
      span.style.left = '-9999px';
      document.body.appendChild(span);
      textWidth = span.offsetWidth;
      document.body.removeChild(span);
      if (textWidth > containerWidth && fontSize > minFontSize) {
        fontSize -= 0.5;
      } else {
        break;
      }
    } while (fontSize > minFontSize);
    el.style.fontSize = fontSize + 'px';
  }

  function scaleSummaryTip() {
    const el = els.summaryTip;
    if (!el) return;
    const style = window.getComputedStyle(el);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const availableWidth = el.clientWidth - paddingLeft - paddingRight;
    if (availableWidth <= 0) return;
    const minFontSize = 7;
    let fontSize = 12;
    let textWidth;
    do {
      const span = document.createElement('span');
      span.textContent = el.textContent;
      span.style.fontSize = fontSize + 'px';
      span.style.fontFamily = style.fontFamily;
      span.style.fontWeight = style.fontWeight;
      span.style.position = 'absolute';
      span.style.visibility = 'hidden';
      span.style.whiteSpace = 'nowrap';
      span.style.left = '-9999px';
      document.body.appendChild(span);
      textWidth = span.offsetWidth;
      document.body.removeChild(span);
      if (textWidth > availableWidth && fontSize > minFontSize) {
        fontSize -= 0.5;
      } else {
        break;
      }
    } while (fontSize > minFontSize);
    el.style.fontSize = fontSize + 'px';
  }

  // ---------- 渲染：昨天 ----------
  function renderYesterday(cache) {
    if (cache) {
      els.yesterdaySub.textContent = shortDate(cache.date) + ' ' + weekDayFromDate(cache.date);
      els.yesterdayWeather.textContent = cache.dayWeather || '—';
      els.yesterdayIcon.innerHTML = iconFor(cache.dayWeather);
      els.yesterdayDayTemp.textContent = cache.dayTemp || '--';
      els.yesterdayNightTemp.textContent = cache.nightTemp || '--';
    } else {
      els.yesterdaySub.textContent = '—';
      els.yesterdayWeather.textContent = '—';
      els.yesterdayIcon.innerHTML = '';
      els.yesterdayDayTemp.textContent = '--';
      els.yesterdayNightTemp.textContent = '--';
    }
  }

  // ---------- 渲染：明天 ----------
  function renderTomorrow(daily) {
    if (!daily) {
      els.tomorrowSub.textContent = '—';
      els.tomorrowWeather.textContent = '—';
      els.tomorrowIcon.innerHTML = '';
      els.tomorrowDayTemp.textContent = '--';
      els.tomorrowNightTemp.textContent = '--';
      if (els.tomorrowTrend) els.tomorrowTrend.textContent = '';
      return;
    }
    els.tomorrowSub.textContent = shortDate(daily.fxDate) + ' ' + weekDayFromDate(daily.fxDate);
    els.tomorrowWeather.textContent = daily.textDay || '—';
    els.tomorrowIcon.innerHTML = iconFor(daily.textDay);
    els.tomorrowDayTemp.textContent = daily.tempMax || '--';
    els.tomorrowNightTemp.textContent = daily.tempMin || '--';
    // 温度趋势箭头
    const todayMax = safeParseInt(els.todayDayTemp.textContent);
    const tmrMax = safeParseInt(daily.tempMax);
    if (els.tomorrowTrend && !isNaN(todayMax) && !isNaN(tmrMax)) {
      const arrow = tmrMax > todayMax ? '↑' : (tmrMax < todayMax ? '↓' : '→');
      els.tomorrowTrend.textContent = arrow;
      els.tomorrowTrend.className = 'fc-trend ' + (tmrMax > todayMax ? 'trend-up' : (tmrMax < todayMax ? 'trend-down' : 'trend-flat'));
    }
  }

  function renderDay3(daily) {
    if (!daily) {
      els.day3Sub.textContent = '—';
      els.day3Weather.textContent = '—';
      els.day3Icon.innerHTML = '';
      els.day3DayTemp.textContent = '--';
      els.day3NightTemp.textContent = '--';
      if (els.day3Trend) els.day3Trend.textContent = '';
      return;
    }
    els.day3Sub.textContent = shortDate(daily.fxDate) + ' ' + weekDayFromDate(daily.fxDate);
    els.day3Weather.textContent = daily.textDay || '—';
    els.day3Icon.innerHTML = iconFor(daily.textDay);
    els.day3DayTemp.textContent = daily.tempMax || '--';
    els.day3NightTemp.textContent = daily.tempMin || '--';
    // 温度趋势箭头（跟今天比）
    const todayMax = safeParseInt(els.todayDayTemp.textContent);
    const d3Max = safeParseInt(daily.tempMax);
    if (els.day3Trend && !isNaN(todayMax) && !isNaN(d3Max)) {
      const arrow = d3Max > todayMax ? '↑' : (d3Max < todayMax ? '↓' : '→');
      els.day3Trend.textContent = arrow;
      els.day3Trend.className = 'fc-trend ' + (d3Max > todayMax ? 'trend-up' : (d3Max < todayMax ? 'trend-down' : 'trend-flat'));
    }
  }

  function renderHourly(data) {
    const container = els.hourlyScroll;
    if (!container) return;

    if (!data || !Array.isArray(data.hourly) || data.hourly.length === 0) {
      container.innerHTML = '';
      return;
    }

    const hourly = data.hourly;
    const now = new Date();
    const currentHour = now.getHours();

    let html = '';
    hourly.forEach((item, i) => {
      const hour = parseInt(item.fxTime?.split('T')[1]?.split(':')[0] || '0');
      const isNow = Math.abs(hour - currentHour) <= 1 && i === 0;
      const timeLabel = isNow ? '现在' : pad(hour) + ':00';
      const pop = safeParseInt(item.pop);
      const temp = safeParseInt(item.temp);
      // 图标始终用天气码，它是API的权威气象判断
      let icon;
      if (isNow && currentObsText) {
        icon = obsTextToEmoji(currentObsText);
      } else {
        icon = getHourlyIcon(item.icon);
      }
      // 降水判断以天气码为准，不用pop阈值
      const hasRain = /雨|雷|雪/.test(item.text || '');
      // 降水概率只在天气码已指示降水时显示，或概率≥50%时才显示
      const showPop = hasRain || pop >= 50;
      const popHtml = showPop ? pop + '%' : '';

      html += `<div class="hourly-item${isNow ? ' now' : ''}">
        <div class="hourly-rain${hasRain ? ' active' : ''}"></div>
        <span class="hourly-time">${escapeHtml(timeLabel)}</span>
        <span class="hourly-icon">${icon}</span>
        <span class="hourly-pop">${escapeHtml(popHtml)}</span>
        <span class="hourly-temp">${temp}°</span>
      </div>`;
    });
    container.innerHTML = html;
  }

  function getHourlyIcon(iconCode) {
    if (!iconCode) return '—';
    const code = String(iconCode);
    if (code === '100') return '☀️';   // 晴
    if (code === '101') return '🌤️';   // 多云
    if (code === '102') return '⛅';    // 少云
    if (code === '103') return '🌤️';   // 晴间多云
    if (code === '104') return '☁️';    // 阴
    if (code.startsWith('2')) return '🌦️'; // 有风/阵雨类
    if (code.startsWith('3') || code.startsWith('6')) return '🌧️';
    if (code.startsWith('4') || code.startsWith('8')) return '❄️';
    if (code.startsWith('5')) return '🌫️';
    if (code.startsWith('7')) return '🌦️';
    if (code.startsWith('9')) return '💨';
    return '☀️';
  }

  function obsTextToEmoji(text) {
    if (!text) return '—';
    if (text.indexOf('雷') >= 0) return '⛈️';
    if (text.indexOf('雨夹雪') >= 0) return '🌨️';
    if (text.indexOf('雪') >= 0 || text.indexOf('冰') >= 0) return '❄️';
    if (text.indexOf('雨') >= 0) return '🌧️';
    if (text.indexOf('雾') >= 0 || text.indexOf('霾') >= 0 || text.indexOf('沙') >= 0) return '🌫️';
    if (text.indexOf('阴') >= 0) return '☁️';
    if (text.indexOf('多云') >= 0) return '⛅';
    return '☀️';
  }

  // ---------- 背景效果控制 ----------
  function updateBackgroundEffect(weatherText) {
    if (!weatherText) {
      ParticleSystem.setEffect('none');
      return;
    }

    const today = new Date();
    const dateKey = `${today.getMonth() + 1}-${today.getDate()}`;
    
    if (FESTIVAL_DATA[dateKey]) {
      ParticleSystem.setEffect('none');
      return;
    }

    const mapped = WEATHER_EFFECT_MAP[weatherText];
    if (mapped) {
      ParticleSystem.setEffect(mapped.effect, mapped.level);
    } else {
      ParticleSystem.setEffect('none');
    }
  }

  function updateFestivalTheme() {
    const today = new Date();
    const dateKey = `${today.getMonth() + 1}-${today.getDate()}`;
    const festival = FESTIVAL_DATA[dateKey];
    const solarTerm = SOLAR_TERMS[dateKey];

    const body = document.body;
    body.classList.remove('theme-spring', 'theme-lantern', 'theme-midautumn', 
                          'theme-christmas', 'theme-valentine', 'theme-national', 'theme-tomb');

    if (festival) {
      body.classList.add(`theme-${festival.theme}`);
      updateTopBarDecoration(festival.name, festival.theme);
    } else {
      updateTopBarDecoration(null, null);
    }
  }

  const FESTIVAL_ICONS = {
    '元旦': '🎆',
    '春节': '🧧',
    '清明': '🌿',
    '劳动节': '🎉',
    '端午': '🌿',
    '国庆': '🇨🇳',
    '圣诞节': '🎄',
    '情人节': '❤️'
  };

  function updateTopBarDecoration(name, theme) {
    let deco = els.festivalDecoration;
    if (!deco) {
      deco = document.createElement('span');
      deco.id = 'festivalDecoration';
      deco.className = 'festival-decoration';
      const holidayRow = document.querySelector('.holiday-row');
      if (holidayRow) {
        holidayRow.appendChild(deco);
      }
      els.festivalDecoration = deco;
    }

    if (name && theme) {
      const icon = FESTIVAL_ICONS[name] || '✨';
      deco.innerHTML = `<span class="deco-icon">${icon}</span><span class="deco-name">${escapeHtml(name)}</span>`;
      deco.className = `festival-decoration theme-${theme}`;
      deco.style.display = 'inline-flex';
    } else {
      deco.style.display = 'none';
    }
  }

  // ---------- 节假日提醒 ----------
  const HOLIDAYS_2026 = {
    '1-1': '元旦', '1-2': '元旦', '1-3': '元旦',
    '2-17': '春节', '2-18': '春节', '2-19': '春节', '2-20': '春节', '2-21': '春节', '2-22': '春节', '2-23': '春节',
    '4-4': '清明', '4-5': '清明', '4-6': '清明',
    '5-1': '劳动节', '5-2': '劳动节', '5-3': '劳动节', '5-4': '劳动节', '5-5': '劳动节',
    '5-31': '端午', '6-1': '端午', '6-2': '端午',
    '10-1': '国庆', '10-2': '国庆', '10-3': '国庆', '10-4': '国庆', '10-5': '国庆', '10-6': '国庆', '10-7': '国庆', '10-8': '国庆',
  };

  const WORKDAY_SWAP_2026 = {
    '2-15': '春节调休', '2-28': '春节调休',
    '4-26': '劳动节调休',
    '9-27': '国庆调休', '10-11': '国庆调休',
  };

  function updateHolidayTag() {
    const now = new Date();
    const key = `${now.getMonth() + 1}-${now.getDate()}`;
    const tag = els.holidayTag;
    if (!tag) return;

    if (HOLIDAYS_2026[key]) {
      tag.textContent = '🎉 ' + HOLIDAYS_2026[key] + '假期';
      tag.className = 'holiday-tag holiday';
    } else if (WORKDAY_SWAP_2026[key]) {
      tag.textContent = '⚠️ 调休上班';
      tag.className = 'holiday-tag workday-swap';
    } else {
      const day = now.getDay();
      if (day === 0 || day === 6) {
        tag.textContent = '🌿 休息日';
        tag.className = 'holiday-tag weekend';
      } else {
        tag.textContent = '📅 工作日';
        tag.className = 'holiday-tag workday';
      }
    }
  }

  // ---------- 渲染：预警 ----------
  function renderWarning(data) {
    const alerts = data && Array.isArray(data.alerts) ? data.alerts : [];
    els.alertList.innerHTML = '';
    if (alerts.length === 0) {
      return;
    }

    const displayAlerts = alerts.slice(0, MAX_ALERTS);
    const fragment = document.createDocumentFragment();

    displayAlerts.forEach(alert => {
      const color = alert.color?.code || 'yellow';
      const typeName = alert.eventType?.name || '气象';
      const headline = alert.headline || '';
      const description = alert.description || '';
      const icon = getAlertIcon(headline || typeName);

      let displayText;
      if (headline) {
        displayText = simplifyAlertText(headline);
        displayText = truncateText(displayText, 8);
      } else {
        const levelName = getAlertLevelName(color);
        const typeHasSuffix = typeName.indexOf('预警') >= 0;
        displayText = levelName + typeName + (typeHasSuffix ? '' : '预警');
        displayText = simplifyAlertText(displayText);
        displayText = truncateText(displayText, 8);
      }

      const titleText = [headline, description].filter(Boolean).join('\n\n');

      const bar = document.createElement('div');
      bar.className = 'alert-bar alert-' + color;
      if (titleText) bar.title = titleText;
      bar.innerHTML = `<span class="alert-bar-icon">${icon}</span><span class="alert-bar-text">${escapeHtml(displayText)}</span>`;
      fragment.appendChild(bar);
    });

    if (alerts.length > MAX_ALERTS) {
      const moreBar = document.createElement('div');
      moreBar.className = 'alert-bar alert-yellow';
      moreBar.innerHTML = `<span class="alert-bar-text">+${alerts.length - MAX_ALERTS}条</span>`;
      fragment.appendChild(moreBar);
    }

    els.alertList.appendChild(fragment);
  }

  function getAlertLevelName(color) {
    const map = { blue: '蓝色', yellow: '黄色', orange: '橙色', red: '红色', gray: '灰色' };
    return map[color] || '其它';
  }

  function getAlertIcon(type) {
    if (!type) return '⚠';
    if (type.indexOf('台风') >= 0) return '🌀';
    if (type.indexOf('暴雨') >= 0) return '🌧';
    if (type.indexOf('雷电') >= 0 || type.indexOf('雷') >= 0) return '⛈';
    if (type.indexOf('大风') >= 0 || type.indexOf('风') >= 0) return '💨';
    if (type.indexOf('冰雹') >= 0) return '🧊';
    if (type.indexOf('高温') >= 0) return '🔥';
    if (type.indexOf('寒潮') >= 0 || type.indexOf('寒冷') >= 0) return '❄';
    if (type.indexOf('大雾') >= 0 || type.indexOf('雾') >= 0 || type.indexOf('霾') >= 0) return '🌫';
    if (type.indexOf('干旱') >= 0) return '🏜';
    if (type.indexOf('霜冻') >= 0) return '🌨';
    if (type.indexOf('森林火险') >= 0 || type.indexOf('火险') >= 0) return '🔥';
    if (type.indexOf('地质灾害') >= 0 || type.indexOf('滑坡') >= 0 || type.indexOf('泥石流') >= 0) return '⛰';
    return '⚠';
  }

  // ---------- 城市搜索 ----------
  const CITY_STORAGE_KEY = 'weather_selected_city';

  function loadSavedCity() {
    try {
      const raw = localStorage.getItem(CITY_STORAGE_KEY);
      if (raw) {
        const city = JSON.parse(raw);
        if (city && city.lat != null && city.lon != null) {
          currentCityInfo = city;
          currentLocation = `${city.lon},${city.lat}`;
          if (els.cityInput) els.cityInput.value = city.name || '';
        }
      }
    } catch (e) {}
  }

  function saveCurrentCity() {
    try {
      localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(currentCityInfo));
    } catch (e) {}
  }

  async function searchCity(keyword) {
    if (!keyword || keyword.length < 2) {
      hideDropdown();
      return;
    }
    const version = ++searchVersion;
    try {
      const resp = await fetchWithTimeout(`/api/geo/lookup?location=${encodeURIComponent(keyword)}`);
      const data = await resp.json();
      if (version !== searchVersion) return;
      if (data.code === '200' && Array.isArray(data.location) && data.location.length > 0) {
        showDropdown(data.location);
      } else {
        showNoResult();
      }
    } catch (e) {
      if (version !== searchVersion) return;
      showNoResult();
    }
  }

  function showDropdown(locations) {
    const dd = els.cityDropdown;
    if (!dd) return;
    activeDropdownIndex = -1;
    const LEVEL_MAP = { province: '省', city: '市', district: '区', street: '街道' };
    dd.innerHTML = locations.map((loc, i) => {
      const levelText = LEVEL_MAP[loc.level] || '';
      // 区级显示"市名+区名"，市级只显示市名
      const region = loc.level === 'district' && loc.adm1 ? `${loc.adm1}${loc.name}` : loc.name;
      return `<div class="city-option" data-index="${i}" data-id="${loc.id}" data-name="${escapeHtml(loc.name)}" data-lat="${loc.lat}" data-lon="${loc.lon}" data-adm1="${escapeHtml(loc.adm1 || '')}" data-level="${escapeHtml(loc.level || '')}">
        <span class="city-option-name">${escapeHtml(region)}<small style="font-weight:400;color:var(--text-4);margin-left:4px;font-size:8px">${escapeHtml(levelText)}</small></span>
        <span class="city-option-region">${escapeHtml(loc.adm1 || '')}</span>
      </div>`;
    }).join('');
    dd.classList.remove('hidden');

    dd.querySelectorAll('.city-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectCity({
          id: opt.dataset.id,
          name: opt.dataset.name,
          lat: parseFloat(opt.dataset.lat),
          lon: parseFloat(opt.dataset.lon),
          adm1: opt.dataset.adm1 || '',
          level: opt.dataset.level || '',
        });
      });
    });
  }

  function showNoResult() {
    const dd = els.cityDropdown;
    if (!dd) return;
    dd.innerHTML = '<div class="city-option-noresult">未找到匹配城市</div>';
    dd.classList.remove('hidden');
  }

  function hideDropdown() {
    const dd = els.cityDropdown;
    if (dd) dd.classList.add('hidden');
    activeDropdownIndex = -1;
  }

  function selectCity(city) {
    currentCityInfo = city;
    currentLocation = `${city.lon},${city.lat}`;
    if (els.cityInput) els.cityInput.value = city.name;
    hideDropdown();
    saveCurrentCity();
    refreshWeather();
  }

  function navigateDropdown(direction) {
    const dd = els.cityDropdown;
    if (!dd || dd.classList.contains('hidden')) return;
    const options = dd.querySelectorAll('.city-option');
    if (options.length === 0) return;

    options.forEach(o => o.classList.remove('active'));
    activeDropdownIndex += direction;
    if (activeDropdownIndex < 0) activeDropdownIndex = options.length - 1;
    if (activeDropdownIndex >= options.length) activeDropdownIndex = 0;
    options[activeDropdownIndex].classList.add('active');
    options[activeDropdownIndex].scrollIntoView({ block: 'nearest' });
  }

  function confirmDropdownSelection() {
    const dd = els.cityDropdown;
    if (!dd || dd.classList.contains('hidden')) return;
    const options = dd.querySelectorAll('.city-option');
    if (activeDropdownIndex >= 0 && activeDropdownIndex < options.length) {
      options[activeDropdownIndex].click();
    }
  }

  function initCitySearch() {
    const input = els.cityInput;
    if (!input) return;

    loadSavedCity();
    if (els.cityInput && currentCityInfo.name) {
      els.cityInput.value = currentCityInfo.name;
    }

    input.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      const val = input.value.trim();
      searchDebounceTimer = setTimeout(() => searchCity(val), 250);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); navigateDropdown(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); navigateDropdown(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); confirmDropdownSelection(); }
      else if (e.key === 'Escape') { hideDropdown(); input.blur(); }
    });

    input.addEventListener('focus', () => {
      const val = input.value.trim();
      if (val.length >= 2) searchCity(val);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.city-search')) hideDropdown();
    });
  }

  // ---------- 主刷新流程 ----------
  async function refreshWeather() {
    els.updateMeta.textContent = '正在获取数据…';
    const version = ++requestVersion;

    // 使用 Promise.allSettled 确保部分失败不影响其他数据
    const results = await Promise.allSettled([
      fetchQWeatherNow(currentLocation),
      fetchQWeather7d(currentLocation),
      fetchQWeatherHourly(currentLocation),
      fetchQWeatherIndices(currentLocation),
      fetchAirQuality(currentLocation),
      fetchWarning(currentLocation),
    ]);

    // 丢弃过期响应（用户已切换城市）
    if (version !== requestVersion) return;

    // 解析结果，失败则使用null/空对象
    const [nowRes, d7Res, hourlyRes, idxRes, airRes, warnRes] = results.map(r =>
      r.status === 'fulfilled' ? r.value : null
    );

    const now = nowRes && nowRes.code === '200' ? nowRes.now : null;
    const daily = d7Res && d7Res.code === '200' && Array.isArray(d7Res.daily) ? d7Res.daily : [];
    const todayDaily = daily[0] || null;
    const tomorrowDaily = daily[1] || null;
    const day3Daily = daily[2] || null;

    if (todayDaily) {
      saveTodayCache(todayDaily);
      const yDate = dateOffset(todayDaily.fxDate, -1);
      renderYesterday(readCache(yDate));
    }

    renderToday(now, todayDaily);
    renderTomorrow(tomorrowDaily);
    renderDay3(day3Daily);
    renderHourly(hourlyRes && hourlyRes.code === '200' ? hourlyRes : null);
    renderIndices(idxRes && idxRes.code === '200' ? idxRes.daily : null);
    renderAirQuality(airRes && airRes.current ? airRes : null);
    renderWarning(warnRes && warnRes.alerts ? warnRes : null);
    renderSummary(now, todayDaily,
      hourlyRes && hourlyRes.code === '200' ? hourlyRes : null,
      idxRes && idxRes.code === '200' ? idxRes.daily : null,
      warnRes && warnRes.alerts ? warnRes : null);

    updateBackgroundEffect(now ? now.text : (todayDaily ? todayDaily.textDay : null));
    updateFestivalTheme();

    const updateTime = d7Res?.updateTime || nowRes?.updateTime || '';
    if (updateTime) {
      const t = updateTime.replace('T', ' ').replace('+08:00', '');
      els.updateMeta.textContent = `数据更新 ${t}`;
    } else if (!now && daily.length === 0) {
      els.updateMeta.textContent = '暂无天气数据';
    }

    // 统计失败数量，提示用户
    const failedCount = results.filter(r => r.status === 'rejected').length;
    if (failedCount === results.length) {
      els.updateMeta.textContent = '所有数据获取失败，请检查网络';
      els.updateMeta.style.color = '#f87171';
    } else if (failedCount > 0) {
      console.warn(`${failedCount}个接口请求失败`);
    }
  }

  // ---------- 800x480 等比例缩放 ----------
  const DESIGN_W = 800;
  const DESIGN_H = 480;

  function resizeStage() {
    const stage = document.querySelector('.stage');
    if (!stage) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H);
    stage.style.transform = `scale(${scale})`;
  }

  // ---------- 启动 ----------
  function init() {
    resizeStage();
    window.addEventListener('resize', resizeStage);

    updateClock();
    updateDate();
    updateHolidayTag();
    setInterval(updateClock, 1000);
    setInterval(() => { updateDate(); updateHolidayTag(); }, 30 * 1000);

    initCitySearch();

    if (els.fullscreenBtn) {
      els.fullscreenBtn.addEventListener('click', toggleFullscreen);
      updateFullscreenIcon();
    }

    document.addEventListener('fullscreenchange', updateFullscreenIcon);

    ParticleSystem.init();
    refreshWeather();
    setInterval(refreshWeather, REFRESH_INTERVAL);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {});
    } else {
      document.exitFullscreen().catch(err => {});
    }
  }

  function updateFullscreenIcon() {
    if (els.fullscreenBtn) {
      els.fullscreenBtn.textContent = document.fullscreenElement ? '⇱' : '⇲';
      els.fullscreenBtn.title = document.fullscreenElement ? '退出全屏 (Esc)' : '全屏显示 (F11)';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();