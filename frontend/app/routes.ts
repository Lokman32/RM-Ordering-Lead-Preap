import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route('/login', 'routes/login.jsx'),
  route('/', 'routes/_redirect.jsx'),  
  // tubes
  route('/tube/index', 'routes/tubePages/index.jsx'),
  route('/tube/validate', 'routes/tubePages/confirm.jsx'),
  route('/tube/deliver', 'routes/tubePages/deliver.jsx'),
  route('/tube/retard', 'routes/tubePages/retard.jsx'),

  // logistics
  route('/logistic/index', 'routes/logistic/index.jsx'),

  // admin
  route('/admin/rack', 'routes/admin/rack.jsx'),
  route('/admin/dashboard', 'routes/admin/dashboard.jsx'),
  route('/admin/commandes', 'routes/admin/commandes.jsx'),
] satisfies RouteConfig;
