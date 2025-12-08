// Import each route module so it registers itself with the shared registry.
import "./hello/hello";
import "./healthCheck/healthCheck";
import "./user/router/userRouter";

export { applyRegisteredRoutes, mountOpenAPI, registerRoute } from "./registry/registry";
