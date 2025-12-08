// Import each route module so it registers itself with the shared registry.
import "./hello/hello";

export { applyRegisteredRoutes, registerRoute, mountOpenAPI } from "./registry/registry";
