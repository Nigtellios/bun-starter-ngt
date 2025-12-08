// Import each route module so it registers itself with the shared registry.
import "./healthCheck/healthCheck";
import "./user/router/userRouter";

export { applyRegisteredRoutes, mountOpenAPI, registerRoute } from "../common/apiRegistry/registry";
