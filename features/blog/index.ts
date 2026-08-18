/**
 * Blog — the canonical blog module.
 *
 *   UI  →  service  →  repository  →  mock store (seed + localStorage)
 *
 * Import from here rather than reaching into the files: the split between
 * service and repository is the seam a real API replaces, and consumers should
 * not care which side of it they are on.
 */

export type {
  BlogAlign,
  BlogBlock,
  BlogCategory,
  BlogCategoryInput,
  BlogCategoryPatch,
  BlogCategoryStatus,
  BlogComment,
  BlogDetail,
  BlogPost,
  BlogPostInput,
  BlogPostPatch,
  BlogSeo,
  BlogStatus,
} from "@/types/blog";
export { BLOG_CATEGORY_STATUS_VALUES, BLOG_STATUS_VALUES } from "@/types/blog";

export { BLOG_POSTS_SEED } from "@/constants/blog-posts";
export { BLOG_CATEGORIES_SEED } from "@/constants/blog-categories";

export { slugify, isValidSlug, uniqueSlug } from "./slug";
export {
  BLOG_DASHBOARD_HREF,
  BLOG_HREF,
  blogCategoryHref,
  blogEditHref,
  blogPostHref,
  blogPreviewHref,
  blogTagHref,
} from "./links";

export type { BlogRepository } from "./repository";
export { blogRepository, createMockBlogRepository, normalizeTags } from "./repository";

export type { BlogQuery } from "./service";
export {
  addBlogPostTags,
  archiveBlogPost,
  buildBlogDetail,
  createBlogCategory,
  createBlogPost,
  deleteBlogCategory,
  deleteBlogPost,
  filterBlogPosts,
  getBlogAuthors,
  getBlogCategories,
  getBlogCategoriesSync,
  getBlogDetail,
  getBlogPostById,
  getBlogPostBySlug,
  getBlogPostBySlugSync,
  getBlogPosts,
  getBlogPostsSync,
  getBlogTags,
  isBlogSlugAvailable,
  postDate,
  publishBlogPost,
  relatedBlogPosts,
  restoreBlogPost,
  setBlogPostFeatured,
  setBlogPostStatus,
  subscribeToBlog,
  suggestBlogCategorySlug,
  suggestBlogSlug,
  unpublishBlogPost,
  updateBlogCategory,
  updateBlogPost,
  withCounts,
} from "./service";

export {
  useAllBlogCategories,
  useAllBlogPosts,
  useBlogCategories,
  useBlogPost,
  useBlogPosts,
  useBlogTags,
} from "./hooks";

export { BlogDetailView } from "./ui/blog-detail-view";
export { BlogArticle } from "./ui/blog-article";
