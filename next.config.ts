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
      /**
       * Server Action 请求体上限，默认 1MB 放不下照片 data URL。
       * 客户端已把图压到 ~300KB（base64 后 ~400KB），2mb 留足抖动空间。
       * 注意：改动后需重启进程（dev/prod）才生效。
       */
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;