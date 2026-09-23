# 调查问卷 H5 + 转盘抽奖

这是普通手机网页版本，不是微信小程序。参与者扫二维码后，用手机浏览器直接打开即可。

## 功能

- 手机端问卷
- 提交后进入转盘抽奖
- 中奖概率和库存放在 Supabase 数据库函数中处理
- 自动统计访问人数、问卷参与人数、抽奖人数
- 每台设备默认一次有效提交/一次抽奖
- 中奖后填写收件人、手机号、详细地址
- `qr.html` 用于根据正式网址生成二维码

## 第 1 步：创建 Supabase

打开 https://supabase.com/ 注册并创建一个项目。

在项目里进入 `SQL Editor` → `New query`，把 `supabase.sql` 全部复制进去运行。

Supabase 当前推荐浏览器端使用 publishable key；不要把 secret key 写进网页。前端通过 RPC 调用数据库函数。

## 第 2 步：拿到连接信息

在 Supabase 项目 Dashboard 的 Connect / API Keys 页面找到：

- Project URL
- Publishable key（以 `sb_publishable_` 开头）

复制 `config.example.js` 为 `config.js`，填入：

```js
window.APP_CONFIG = {
  SUPABASE_URL: '你的 Project URL',
  SUPABASE_PUBLISHABLE_KEY: '你的 publishable key'
};
```

## 第 3 步：本地测试

不要直接双击 `index.html`。推荐在电脑上用一个静态服务器打开，例如 VS Code 的 Live Server，或者在项目文件夹运行：

`python -m http.server 8080`

然后浏览器访问：`http://localhost:8080/`

如果统计数字能显示、问卷能提交、转盘能出结果，说明前后端已接通。

## 第 4 步：修改问卷

编辑 `app.js` 顶部的 `QUESTIONS` 数组。
支持：

- radio：单选
- checkbox：多选
- text：填空

## 第 5 步：修改奖品

在 Supabase → Table Editor → `prizes` 中修改：

- `name`：奖品名称
- `stock`：库存
- `weight`：权重，越大概率越高
- `enabled`：是否参加抽奖
- `sort_order`：转盘显示顺序

## 第 6 步：正式发布网页

把整个文件夹部署到任意静态网站托管平台。部署完成后会得到一个 `https://...` 网址。

把这个网址打开 `qr.html`，生成二维码。别人扫码即可进入网页。

## 第 7 步：查看人数和中奖信息

打开 Supabase Dashboard：

- `visitors`：访问设备记录
- `survey_responses`：问卷答案
- `draw_logs`：中奖记录
- `shipping_orders`：收货信息
- `prizes`：奖品库存和概率

## 重要

浏览器版本没有微信身份体系，因此“每人一次”是通过设备 UUID 实现的。它适合调查活动，但不能把它理解成实名级的“一人一票”。如果需要严格限制一个手机号/学号只能参与一次，可以增加短信验证码或登录验证。

正式活动涉及手机号和收货地址时，请根据实际用途配置隐私告知、数据保存周期和访问权限。
