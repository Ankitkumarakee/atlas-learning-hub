import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import HomePage from "@/pages/HomePage";
import ProfilePage from "@/pages/ProfilePage";
import SearchPage from "@/pages/SearchPage";
import BlogDetailPage from "@/pages/blogs/BlogDetailPage";
import BlogEditorPage from "@/pages/blogs/BlogEditorPage";
import BlogListPage from "@/pages/blogs/BlogListPage";
import CreatorDashboardPage from "@/pages/dashboards/CreatorDashboardPage";
import StudentDashboardPage from "@/pages/dashboards/StudentDashboardPage";
import NoteDetailPage from "@/pages/notes/NoteDetailPage";
import NoteListPage from "@/pages/notes/NoteListPage";
import NoteUploadPage from "@/pages/notes/NoteUploadPage";
import AITutorPage from "@/pages/tutor/AITutorPage";
import VideoDetailPage from "@/pages/videos/VideoDetailPage";
import VideoListPage from "@/pages/videos/VideoListPage";
import VideoUploadPage from "@/pages/videos/VideoUploadPage";
import {
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

/* ProfilePage imported from @/pages/ProfilePage (also used for /profile/$id) */
const ProfileByIdPage = ProfilePage;

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

const rootRoute = createRootRouteWithContext()({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const blogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/blogs",
  component: BlogListPage,
});

const blogDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/blogs/$id",
  component: BlogDetailPage,
});

const newBlogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/blogs/new",
  component: BlogEditorPage,
});

const editBlogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/blogs/$id/edit",
  component: BlogEditorPage,
});

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes",
  component: NoteListPage,
});

const noteDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes/$id",
  component: NoteDetailPage,
});

const newNoteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes/new",
  component: NoteUploadPage,
});

const videosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/videos",
  component: VideoListPage,
});

const videoDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/videos/$id",
  component: VideoDetailPage,
});

const newVideoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/videos/new",
  component: VideoUploadPage,
});

const tutorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tutor",
  component: AITutorPage,
});

const tutorConversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tutor/$conversationId",
  component: AITutorPage,
});

const creatorDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/creator",
  component: CreatorDashboardPage,
});

const studentDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/student",
  component: StudentDashboardPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const profileByIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$id",
  component: ProfileByIdPage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    q?: string;
    type?: "all" | "blog" | "note" | "video";
    sort?: "newest" | "mostViewed" | "mostLiked" | "mostBookmarked";
  } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    type:
      typeof search.type === "string" &&
      ["all", "blog", "note", "video"].includes(search.type)
        ? (search.type as "all" | "blog" | "note" | "video")
        : undefined,
    sort:
      typeof search.sort === "string" &&
      ["newest", "mostViewed", "mostLiked", "mostBookmarked"].includes(
        search.sort,
      )
        ? (search.sort as
            | "newest"
            | "mostViewed"
            | "mostLiked"
            | "mostBookmarked")
        : undefined,
  }),
  component: SearchPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  blogsRoute,
  blogDetailRoute,
  newBlogRoute,
  editBlogRoute,
  notesRoute,
  noteDetailRoute,
  newNoteRoute,
  videosRoute,
  videoDetailRoute,
  newVideoRoute,
  tutorRoute,
  tutorConversationRoute,
  creatorDashboardRoute,
  studentDashboardRoute,
  profileRoute,
  profileByIdRoute,
  searchRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  );
}
