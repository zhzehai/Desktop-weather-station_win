天气显示台项目功能说明书

项目版本：v1.0.0
创建日期：2026年7月16日
开发环境：Node.js + Express + JavaScript
部署目标：
==========================================================
一、项目概述
==========================================================
本项目是一个专业的天气显示应用。采用"深空玻璃"设计风格，以琥珀色为主色调，强调信息分层和视觉焦点。

<img width="580" height="339" alt="image" src="https://github.com/user-attachments/assets/88daf573-2741-4a8e-a34a-ebb36b0469d1" />

图1-1：天气显示台完整页面效果图

二、功能优先级总览

<img width="774" height="543" alt="image" src="https://github.com/user-attachments/assets/1d90390d-1974-417c-9ab3-de82788a86ee" />

三、核心功能详细说明

3.1 实时天气（P0级）

【功能描述】：展示当前城市的实时气象数据，包括温度、天气状况、体感温度、最高/最低温、日出日落时间等。

【数据来源】：和风天气API（/api/qweather/now）

【展示内容】：

<img width="774" height="318" alt="image" src="https://github.com/user-attachments/assets/1f4dc07e-9c47-4de7-be88-8708c421a9c1" />

<img width="729" height="177" alt="image" src="https://github.com/user-attachments/assets/8ace533c-3af3-4c2c-b963-ca27ca037fd7" />

图3-1：实时天气主区块效果图
3.2 气象预警（P0级）

<img width="789" height="155" alt="image" src="https://github.com/user-attachments/assets/f571b4ec-94ed-4dc1-a151-0755bcacd17c" />

【预警类型】：支持暴雨、雷电、台风、高温、寒潮、大雾、霾、沙尘暴、冰雹、大风等10+种预警类型。

【文本处理】：自动剥离"xxx气象台发布"等前缀，简化预警文本，保留核心信息。

<img width="521" height="61" alt="image" src="https://github.com/user-attachments/assets/c6007be8-da44-4a49-a879-7ef467627b15" />

图3-2：顶部栏（含预警信息区域）效果图

3.3 逐小时预报（P1级）

【功能描述】：水平滚动展示未来24小时的逐小时天气预报，包括时间、天气图标、降水概率、温度。

【数据来源】：和风天气API（/api/qweather/hourly）

【展示特点】：

<img width="794" height="160" alt="image" src="https://github.com/user-attachments/assets/dc268228-defc-44f9-8486-50440ccae5b1" />

<img width="579" height="93" alt="image" src="https://github.com/user-attachments/assets/85cdc9cc-868e-483d-b58c-b37461db5352" />

图3-3：逐小时预报栏效果图

3.4 生活指数（P1级）

【功能描述】：展示6项与日常生活密切相关的气象指数，帮助用户做出出行决策。

【数据来源】：和风天气API（/api/qweather/indices）

【指数项目】：

<img width="783" height="188" alt="image" src="https://github.com/user-attachments/assets/30b80277-e601-4e61-963c-df3fe2a2600d" />

<img width="565" height="130" alt="image" src="https://github.com/user-attachments/assets/a7a4e17b-ca4e-4919-a02c-4dcc56200013" />

图3-4：生活指数与实时天气同区块展示效果图

3.5 空气质量（P1级）

【功能描述】：展示当前空气质量数据，包括AQI指数、等级、仪表盘进度条和6项污染物数据。

【数据来源】：Open-Meteo API（/api/air/now）

【展示内容】：

<img width="781" height="255" alt="image" src="https://github.com/user-attachments/assets/a2f7f040-0a43-48d6-97e0-fdc74df91a30" />

<img width="567" height="129" alt="image" src="https://github.com/user-attachments/assets/d3a84124-5b12-404a-8be7-1e7f2068f7b5" />

图3-5：空气质量模块效果图

3.6 出行一句话总结（P1级）

【功能描述】：基于天气数据自动生成出行建议，智能判断优先事项。

【优先级逻辑】：

<img width="784" height="202" alt="image" src="https://github.com/user-attachments/assets/856200f6-7a5e-4686-82f4-29019e0d3ef5" />

<img width="567" height="131" alt="image" src="https://github.com/user-attachments/assets/be065b6e-903c-484a-a167-e1c6f47edc9f" />

图3-6：出行一句话总结效果图

3.7 3天预报（P2级）

【功能描述】：横向展示昨日、明日、后日三天的天气对比卡片。

【数据来源】：和风天气API（/api/qweather/7d）+ localStorage缓存（昨日数据）

【展示特点】：

<img width="790" height="131" alt="image" src="https://github.com/user-attachments/assets/722011bb-aaa8-4c5b-b5dc-75fb6f17a721" />

<img width="571" height="93" alt="image" src="https://github.com/user-attachments/assets/3d75ccb7-8c32-4332-9f52-86117558ba3d" />

图3-7：3天预报栏效果图

3.8 城市切换（P2级）

【功能描述】：通过搜索框输入城市名称，切换到其他城市查看天气。

【数据来源】：高德地图行政区划API（/api/geo/lookup）

【交互流程】：

<img width="788" height="159" alt="image" src="https://github.com/user-attachments/assets/1bcfbcf2-d321-43aa-b349-c85e0028a6f5" />

<img width="562" height="332" alt="image" src="https://github.com/user-attachments/assets/8f12d8a6-256e-407b-b27a-0c2d749c6914" />

图3-8：底部城市搜索栏效果图

3.9 节假日提醒（P2级）

【功能描述】：在日期行显示当前日期的节假日、调休和24节气信息。

【数据来源】：本地配置数据

【标签类型】：

<img width="778" height="137" alt="image" src="https://github.com/user-attachments/assets/6c8510b6-493b-43d0-b61a-c6a1750e1f59" />

【节假日数据】：元旦、春节、清明、劳动节、端午、国庆、圣诞节、情人节。

【调休数据】：2026年全年调休安排（春节调休、劳动节调休、国庆调休）。

<img width="567" height="61" alt="image" src="https://github.com/user-attachments/assets/b8fe8022-8272-4263-8aba-341ee35ae774" />

图3-9：顶部栏日期区域（含节假日标签）效果图

3.10 动态背景粒子系统（P3级）

【功能描述】：根据当前天气状况显示动态粒子效果，增强视觉体验。

【效果类型】：

<img width="786" height="156" alt="image" src="https://github.com/user-attachments/assets/21460a95-d0d2-493f-8021-5797d9c31b69" />

<img width="564" height="331" alt="image" src="https://github.com/user-attachments/assets/23bf40cc-89dc-4b29-bfdc-a8a02321e3e8" />

图3-10：动态背景粒子效果展示（页面底部可见粒子）

3.11 节日主题（P3级）

【功能描述】：在特定节日切换页面主题风格，包括背景渐变和卡片边框颜色。

【主题列表】：

<img width="779" height="216" alt="image" src="https://github.com/user-attachments/assets/8b821441-874a-4cf5-ac7b-ac8b3fe40f69" />

<img width="567" height="61" alt="image" src="https://github.com/user-attachments/assets/665674e3-7416-48df-83d0-ab6d54227eba" />

图3-11：默认主题页面效果（节日主题会改变背景和卡片颜色）

3.12 室内环境（预留功能）

<img width="567" height="132" alt="image" src="https://github.com/user-attachments/assets/3aeec244-6275-4389-8df8-f109534ae7c4" />

