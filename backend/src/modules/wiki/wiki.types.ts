/** Shared types for the Wiki module */
export interface WikiTreeNode {
  id: string;
  title: string;
  slug: string;
  parent_page_id: string | null;
  workspace_id: string | null;
  project_code: string | null;
  children: WikiTreeNode[];
}
