/**
 * The values an EditDetailsModal hands back on save.
 *
 * It lives here rather than next to the modal so the hooks that own the saving
 * can describe their own callbacks without importing a component.
 */
export interface DetailsDraft {
  title: string;
  description: string;
  isPublic?: boolean;
}
