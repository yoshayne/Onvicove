// Editable storefront text content.
//
// Themes render their text via <EditableText> instead of hardcoded JSX literals.
// On the live storefront the provider is in read-only mode and simply renders the
// resolved text (tenant override, or the theme's fallback wording). In the dashboard
// page builder the provider runs in `editing` mode, turning each piece of text into
// an inline, click-to-edit field whose changes are collected by key.
//
// Content is a flat map of `section.field` -> string. Only overridden keys are stored;
// every <EditableText> declares its own theme-specific fallback, so unedited text keeps
// each theme's distinct wording.

import { createContext, useContext } from 'react';
import type { ElementType, ReactNode } from 'react';

/** Describes one editable text field for a given theme. Used by the mobile fields panel. */
export interface ContentFieldSchema {
  key: string;
  label: string;
  fallback: string;
  section: string;
}

export type PageContent = Record<string, string>;

interface ContentContextValue {
  content: PageContent;
  editing: boolean;
  onEdit?: (key: string, value: string) => void;
}

const ContentContext = createContext<ContentContextValue>({
  content: {},
  editing: false,
});

export function ContentProvider({
  content,
  editing = false,
  onEdit,
  children,
}: {
  content?: PageContent;
  editing?: boolean;
  onEdit?: (key: string, value: string) => void;
  children: ReactNode;
}) {
  return (
    <ContentContext.Provider value={{ content: content ?? {}, editing, onEdit }}>
      {children}
    </ContentContext.Provider>
  );
}

/** Resolve a content value (override or fallback) without rendering an element. */
export function useContentValue(key: string, fallback: string): string {
  const { content } = useContext(ContentContext);
  return content[key] ?? fallback;
}

interface EditableTextProps {
  /** Stable content key, e.g. "hero.title" or "products.heading". */
  k: string;
  /** Theme-specific default wording shown when there is no override. */
  fallback: string;
  /** Element to render as (default span). */
  as?: ElementType;
  className?: string;
  [prop: string]: unknown;
}

/**
 * Renders editable text. In read-only mode this is just `<as>{value}</as>`.
 * In editing mode the element becomes `contentEditable` and commits on blur.
 */
export function EditableText({ k, fallback, as, className, ...rest }: EditableTextProps) {
  const { content, editing, onEdit } = useContext(ContentContext);
  const Tag = (as ?? 'span') as ElementType;
  const value = content[k] ?? fallback;

  if (!editing) {
    return (
      <Tag className={className} {...rest}>
        {value}
      </Tag>
    );
  }

  return (
    <Tag
      className={`${className ?? ''} ssd-editable`.trim()}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-content-key={k}
      title="Click to edit"
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = (e.currentTarget.textContent ?? '').replace(/\s+/g, ' ').trim();
        onEdit?.(k, next || fallback);
      }}
      // Prevent storefront links/buttons from navigating while editing text.
      onClick={(e: React.MouseEvent) => {
        if (editing) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      {...rest}
    >
      {value}
    </Tag>
  );
}
