// Default export used by Nextra to build navigation.
export default {
  index: {
    type: "page",
    display: "hidden",
  },
  // Use the /docs route only as a container,
  // and show its children directly in the sidebar.
  docs: {
    display: "children",
  },
  dashboard: {
    type: "page",
    title: "Dashboard",
    href: "/dashboard",
  },
  courses: {
    type: "page",
    title: "Courses",
    href: "/courses",
  },
  "how-it-works": {
    type: "page",
    title: "How It Works",
    href: "/#how-it-works",
  },
  assets: {
    display: "hidden",
  },
  resources: {
    display: "hidden",
  },
  submissions: {
    display: "hidden",
  },
  "docs-link": {
    type: "page",
    title: "Docs",
    href: "/docs",
  },
};
