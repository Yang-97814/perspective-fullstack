# 江涛的第一次前后端部署练习

## 这次增加了什么

网页底部“读者留言”是真实后端功能：浏览器请求 `/api/messages`，后端读写 D1 数据库。阅读无需登录；发表和删除自己的留言使用 ChatGPT 登录。昵称与正文公开，账号标识不返回给前端。

`/api/status` 会查询数据库并返回服务器时间和后端版本，不是写死在网页中的模拟结果。

代码使用 TypeScript，而不是 Java；运行在 Cloudflare Workers，不需要在你的电脑上常开 Java。

## 先找到这几个文件

| 文件 | 作用 |
| --- | --- |
| `app/homepage.html` | 原有网站的前端页面 |
| `public/guestbook.js` | 页面通过 fetch 调用后端 |
| `app/api/messages/route.ts` | 查询、新增、删除留言的后端接口 |
| `app/api/status/route.ts` | 后端状态接口 |
| `lib/release.ts` | 第一项练习要修改的后端返回文字 |
| `db/schema.ts` | 数据表结构 |
| `drizzle/` | 建表迁移；已应用的文件不要修改 |
| `.openai/hosting.json` | 当前 Sites 项目的身份与数据库绑定 |

## 第一步：在 Windows 上运行

安装 Node.js 24 LTS 和 Git（如果已经安装就不必重装）。解压后在项目根目录打开 PowerShell：

```powershell
git --version
node --version
npm ci
npm run build
```

首次本地运行需建立本地数据库，在项目根目录执行（这是本地数据库，不是线上数据库）：

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_yielding_may_parker.sql
npm run dev
```

打开终端打印的本地网址，通常为 `http://localhost:5173/`。本机开发的模拟登录只在 portable 模式、回环地址生效。访问 `/signin-with-chatgpt?return_to=/%23guestbook` 可使用本地模拟身份；线上仍是真实 ChatGPT 登录。不要把本地模拟身份当成真实账号。

如果换了电脑，应在新机器重新配置执行环境；这里下载的源码不含 `.sites-runtime`。常规 `npm ci`、`npm run build`、`npm run dev` 会使用 portable 默认设置，无须下载工作环境的辅助脚本。

## 第二步：亲手改一行后端代码

打开 `lib/release.ts`，将返回文字改为：

```ts
export const RELEASE_MESSAGE = '这是我自己修改、提交并部署的第一个后端功能！';
export const RELEASE_VERSION = 'backend-v2';
```

保存。访问本地 `/api/status`，或者点击网页的“刷新数据”，应当看到新内容。

## 第三步：Git 提交（在自己电脑上操作）

下载包不包含原仓库的 `.git` 历史，因此首次这样初始化：

```powershell
git init -b main
git add .
git commit -m "Add my full-stack guestbook"
```

Git 首次使用可能要求设置提交作者，按终端提示填写你自己的姓名和邮箱。

后续修改按以下步骤提交：

```powershell
git diff
git add lib/release.ts
git commit -m "Update backend greeting to v2"
```

`git commit` 只保存在你本机，还没有上传，也没有上线。

## 第四步：推送到你自己的远程仓库

当前网站的源仓库由 ChatGPT Sites 管理，它的工作环境凭证不等于你 Windows 上的 GitHub 登录。不要把工作环境返回的临时 token 写进文件或发给别人。

如需练习自己推送，先在自己的 GitHub / Gitee 中创建一个空仓库，不预先创建 README。复制仓库 HTTPS 地址，替换下面的占位内容后执行：

```powershell
git remote add origin <替换为你自己的仓库HTTPS地址>
git push -u origin main
```

按 Git 客户端提示登录自己的账号。不要照抄尖括号占位符。

`git push` = 将提交上传到远程代码仓库。它不自动意味着网站已经更新。

## 第五步：部署到现有网站

现有网站使用 Sites 的发布流程，不会自动监听你新建的任意 GitHub / Gitee 仓库。

第一次发布基线由助手完成：构建 → 推送 Sites 源仓库 → 保存版本 → 部署。

当你完成自己的 v2 提交后，可以把修改后的源码包上传到本对话，让助手将这一份代码同步到原站点并部署；或者连接可访问你仓库的 GitHub 工具，再让助手读取指定提交。这样你亲自完成本地修改、commit、push，Sites 的发布步骤由助手执行。不能把这描述成你已经在本机独立完成了 Sites 部署。

如希望 `git push` 后自动构建上线，需要额外配置受支持的部署集成；本项目目前没有配置该集成。

部署完成后，访问线上 `/api/status`，确认 `version` 从 `backend-v1` 变成 `backend-v2`，以及 `message` 是你改的文字。这才证明新后端已上线；本地看到 v2 不代表线上也更新了。

## 检查

```powershell
npm test
npm run typecheck
npm run build
```

测试包括真实 SQLite 的新增、查询、删除、身份与权限检查、限频，以及状态接口。测试环境使用内存 SQLite，不会写入线上数据。

## 边界

这是一项小型教学功能，不是带管理员审核、垃圾信息治理和完整运营功能的社区系统。每个登录账号每分钟最多 3 条、最多保留 100 条留言；读者只能删除自己的留言。开发演示的所有公开留言都对访客可见。
