import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Server Actions 的可信来源白名单。
   * 宝塔「Node 项目」通过 Nginx 反代转发请求，Nginx 会把
   * `Host: wangshuyi.wangjicheng.com:443` 透传到后端，而浏览器发起的
   * `Origin: https://wangshuyi.wangjicheng.com` 没有显式端口（443 是 HTTPS 隐式端口），
   * 两者不一致会触发 Next.js 16 的 CSRF/Origin 校验拒绝 Server Actions 请求。
   * 把带端口和不带端口两种形式都加入白名单即可放行。
   * 详见：https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
   */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "wangshuyi.wangjicheng.com",
        "wangshuyi.wangjicheng.com:443",
      ],
    },
  },
};

export default nextConfig;