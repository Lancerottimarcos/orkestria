export type PostStatus = "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
export type AttachmentType = "IMAGE" | "VIDEO" | "FILE";
export type SocialNetwork = "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "YOUTUBE" | "LINKEDIN" | "THREADS";
export type PublishStatus = "PENDING" | "PUBLISHING" | "PUBLISHED" | "FAILED";

export type AttachmentData = {
  id: string;
  url: string;
  type: AttachmentType;
  name: string | null;
};

export type DemandTypeOption = { id: string; name: string; color: string };

export type CommentData = {
  id: string;
  text: string;
  imageUrl: string | null;
  isAutomated: boolean;
  createdAt: string;
  author: { id: string; name: string } | null;
  mentionedUser: { id: string; name: string } | null;
};

export type KanbanCardData = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  estimatedHours: number | null;
  completedAt: string | null;
  createdAt: string;
  columnId: string;
  client: { id: string; name: string; avatarUrl: string | null } | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  post: { id: string; title: string; status: PostStatus; token: string; feedback: string | null } | null;
  demandType: DemandTypeOption | null;
  attachments: AttachmentData[];
  comments: CommentData[];
  checklists: { id: string; title: string; total: number; done: number }[];
  scheduledNetwork: SocialNetwork | null;
  scheduledAt: string | null;
  publishStatus: PublishStatus | null;
};

export type KanbanColumnData = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  boardId: string;
  automationCount: number;
  hasScheduleAutomation: boolean;
  cards: KanbanCardData[];
};

export type KanbanBoardData = {
  id: string;
  name: string;
  position: number;
  client: { id: string; name: string } | null;
};

export type ArchivedCardData = {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  completedAt: string | null;
  archivedAt: string;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  demandType: DemandTypeOption | null;
  columnName: string;
  boardName: string;
};

export type ScheduledCardData = {
  id: string;
  title: string;
  description: string | null;
  scheduledNetwork: SocialNetwork;
  scheduledAt: string;
  publishStatus: PublishStatus | null;
  coverUrl: string | null;
  client: { id: string; name: string; avatarUrl: string | null } | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  demandType: DemandTypeOption | null;
  attachments: AttachmentData[];
  columnName: string;
  boardName: string;
};

export type Option = { id: string; name: string };
export type UserOption = Option & { avatarUrl: string | null };
export type ClientOption = Option & { avatarUrl: string | null };
