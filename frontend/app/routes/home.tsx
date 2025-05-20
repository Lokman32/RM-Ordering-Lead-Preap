import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
    // { link: { rel: "stylesheet", href: "/app.css" } }
  ];
}

export default function Home() {
  return <Welcome />;
}
