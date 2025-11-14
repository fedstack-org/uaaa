---
layout: home

hero:
  name: "UAAA"
  text: "统一认证中台"
  tagline: Unified Authentication And Authorization
  actions:
    - theme: brand
      text: English Documentation
      link: /en/
---

## 关于 UAAA

UAAA (Unified Authentication And Authorization) 是一个企业级的统一认证中台，提供灵活、安全、可扩展的身份管理框架。

## 文档语言

目前文档仅提供英文版本。请访问 [English Documentation](/en/) 查看完整文档。

## 主要特性

- **多级安全模型**：五层安全等级系统 (HINT/LOW/MEDIUM/HIGH/MAX)
- **可扩展凭据**：支持密码、邮箱、短信、TOTP、WebAuthn 等多种认证方式
- **OAuth2 & OIDC**：完整的 OAuth2 和 OpenID Connect 实现
- **插件架构**：模块化插件系统，支持外部身份提供商集成
- **会话管理**：强大的会话和令牌管理系统
- **声明系统**：可扩展的用户声明（claims）系统

## 快速开始

```bash
# 安装 UAAA 服务器
npm install -g @uaaa/server

# 初始化数据库
uaaa init

# 启动服务
uaaa serve
```

访问 `http://localhost:3000` 使用 UAAA。

## 技术栈

**后端：**
- Node.js + Hono
- MongoDB
- JWT + bcrypt

**前端：**
- Nuxt 3 + Vue 3
- Vuetify
- UnoCSS

## 资源链接

- [完整文档（英文）](/en/)
- [GitHub](https://github.com/fedstack-org/uaaa)
- [中国镜像](https://git.pku.edu.cn/uaaa/uaaa)
- [部署指南](/en/deployment)
- [配置参考](/en/configuration)

## 许可证

MIT License
