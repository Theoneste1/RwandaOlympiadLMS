"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { postCommentAction, editCommentAction, deleteCommentAction } from "@/lib/actions/comments";
import type { CommentTarget } from "@prisma/client";

export type CommentWithAuthor = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  deletedAt: string | null;
  parentId: string | null;
};

type FormState = { error?: string; success?: string };
const initialState: FormState = {};

function PostForm({
  targetType,
  targetId,
  parentId,
  placeholder,
  onDone,
}: {
  targetType: CommentTarget;
  targetId: string;
  parentId?: string;
  placeholder: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(postCommentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="comment-form">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea name="body" rows={2} required placeholder={placeholder} className="comment-input" />
      {state.error && <p className="comment-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="comment-submit">
        {pending ? "Posting…" : "Post"}
      </button>
    </form>
  );
}

function CommentItem({
  comment,
  targetType,
  targetId,
  currentUserId,
  canModerate,
  replies,
  isReply = false,
}: {
  comment: CommentWithAuthor;
  targetType: CommentTarget;
  targetId: string;
  currentUserId: string;
  canModerate: boolean;
  replies: CommentWithAuthor[];
  isReply?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(editCommentAction, initialState);
  const [, deleteAction] = useActionState(deleteCommentAction, initialState);
  const isAuthor = comment.authorId === currentUserId;
  const isDeleted = Boolean(comment.deletedAt);

  // Close the edit form once the edit succeeds — adjusted during render (not an effect) per
  // React's guidance for state that only needs to change in response to a prop/state transition.
  const [lastEditSuccess, setLastEditSuccess] = useState(editState.success);
  if (editState.success !== lastEditSuccess) {
    setLastEditSuccess(editState.success);
    if (editState.success) setEditing(false);
  }

  return (
    <li className={isReply ? "comment-item comment-reply" : "comment-item"}>
      <div className="comment-meta">
        <strong>{comment.authorName}</strong>
        <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
      </div>

      {isDeleted ? (
        <p className="comment-body comment-deleted">[Comment removed]</p>
      ) : editing ? (
        <form action={editAction} className="comment-form">
          <input type="hidden" name="id" value={comment.id} />
          <textarea name="body" rows={2} defaultValue={comment.body} required className="comment-input" />
          {editState.error && <p className="comment-error">{editState.error}</p>}
          <div className="comment-actions">
            <button type="submit" disabled={editPending} className="comment-submit">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="comment-cancel">Cancel</button>
          </div>
        </form>
      ) : (
        <p className="comment-body">{comment.body}</p>
      )}

      {!isDeleted && !editing && (
        <div className="comment-actions">
          {!isReply && (
            <button type="button" onClick={() => setReplying((value) => !value)}>Reply</button>
          )}
          {isAuthor && <button type="button" onClick={() => setEditing(true)}>Edit</button>}
          {(isAuthor || canModerate) && (
            <form action={deleteAction}>
              <input type="hidden" name="id" value={comment.id} />
              <button type="submit">Delete</button>
            </form>
          )}
        </div>
      )}

      {!isReply && replying && (
        <PostForm
          targetType={targetType}
          targetId={targetId}
          parentId={comment.id}
          placeholder="Write a reply…"
          onDone={() => setReplying(false)}
        />
      )}

      {!isReply && replies.length > 0 && (
        <ul className="comment-replies">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              targetType={targetType}
              targetId={targetId}
              currentUserId={currentUserId}
              canModerate={canModerate}
              replies={[]}
              isReply
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CommentThread({
  targetType,
  targetId,
  comments,
  currentUserId,
  canModerate,
}: {
  targetType: CommentTarget;
  targetId: string;
  comments: CommentWithAuthor[];
  currentUserId: string;
  canModerate: boolean;
}) {
  const topLevel = comments.filter((comment) => !comment.parentId);
  const repliesByParent = new Map<string, CommentWithAuthor[]>();
  for (const comment of comments) {
    if (comment.parentId) {
      const list = repliesByParent.get(comment.parentId) ?? [];
      list.push(comment);
      repliesByParent.set(comment.parentId, list);
    }
  }

  return (
    <section className="comment-thread">
      <h2 className="comment-thread-title">Discussion</h2>
      <PostForm targetType={targetType} targetId={targetId} placeholder="Ask a question or leave a comment…" />
      {topLevel.length === 0 ? (
        <p className="comment-empty">No comments yet.</p>
      ) : (
        <ul className="comment-list">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              targetType={targetType}
              targetId={targetId}
              currentUserId={currentUserId}
              canModerate={canModerate}
              replies={repliesByParent.get(comment.id) ?? []}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
