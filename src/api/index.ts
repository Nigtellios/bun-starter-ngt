// Import each route module so it registers itself with the shared registry.
import "./hello/hello";

export { applyRegisteredRoutes, mountOpenAPI, registerRoute } from "./registry/registry";
