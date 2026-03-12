import { defineMiddleware } from "astro:middleware";
import { COOKIE_NAME, isPublicPath } from "@/lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url);

  if (isPublicPath(pathname)) {
    return next();
  }

  const token = context.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return context.redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  return next();
});
