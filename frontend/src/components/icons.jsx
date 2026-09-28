/** Inline SVG icons — no icon library, every glyph is one small component. */

function Icon({ size = 16, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconPlus = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconClipboard = (p) => (
  <Icon {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4.5V3.6A1.6 1.6 0 0 1 10.6 2h2.8A1.6 1.6 0 0 1 15 3.6v.9M9 11h6M9 15h4" />
  </Icon>
);

export const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </Icon>
);

export const IconChevronLeft = (p) => (
  <Icon {...p}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);

export const IconChevronRight = (p) => (
  <Icon {...p}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const IconLogout = (p) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Icon>
);

export const IconMenu = (p) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const IconClose = (p) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const IconPencil = (p) => (
  <Icon {...p}>
    <path d="M12 20h9" />
    <path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.5 18.5 3.5 19.5l1-4Z" />
  </Icon>
);

export const IconTrash = (p) => (
  <Icon {...p}>
    <path d="M3.5 6h17M8 6V4.6A1.6 1.6 0 0 1 9.6 3h4.8A1.6 1.6 0 0 1 16 4.6V6M18.5 6l-.9 13.1A2 2 0 0 1 15.6 21H8.4a2 2 0 0 1-2-1.9L5.5 6M10 10.5v6M14 10.5v6" />
  </Icon>
);

export const IconArrowRight = (p) => (
  <Icon {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Icon>
);

export const IconCheck = (p) => (
  <Icon {...p}>
    <path d="m5 13 4.2 4.2L19 7" />
  </Icon>
);

export const IconCheckCircle = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.2 12.3 2.6 2.6 5-5.4" />
  </Icon>
);

export const IconClock = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.2V12l3.2 2" />
  </Icon>
);

export const IconOpenCircle = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconHalfCircle = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconReceipt = (p) => (
  <Icon {...p}>
    <path d="M6 3.5h12v17l-2.4-1.5L13.2 21l-2.4-1.5L8.4 21l-2.4-1.5Z" />
    <path d="M9.2 8.5h5.6M9.2 12.2h5.6" />
  </Icon>
);

export const IconPhone = (p) => (
  <Icon {...p}>
    <path d="M5.2 4h3.4l1.7 4.3-2.1 1.4a12.4 12.4 0 0 0 5.1 5.1l1.4-2.1L19 14.4v3.4a1.6 1.6 0 0 1-1.8 1.6A15.4 15.4 0 0 1 3.6 5.8 1.6 1.6 0 0 1 5.2 4Z" />
  </Icon>
);

export const IconCalendar = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Icon>
);

export const IconUser = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </Icon>
);

export const IconUserOff = (p) => (
  <Icon {...p}>
    <path d="M5 20.5a7 7 0 0 1 11.2-5.6M15.5 5.2a3.8 3.8 0 0 1 0 6.6M19.5 20.5a6.9 6.9 0 0 0-3-5.7" />
    <path d="M4 4l16 16" />
  </Icon>
);

export const IconAlert = (p) => (
  <Icon {...p}>
    <path d="M12 3.5 2.8 20h18.4Z" />
    <path d="M12 10v4.2M12 17.3h.01" />
  </Icon>
);

export const IconInfo = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11.2v5M12 8h.01" />
  </Icon>
);

export const IconRefresh = (p) => (
  <Icon {...p}>
    <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9L4 15.4M3.5 12a8.5 8.5 0 0 1 14.6-5.9L20 8.6" />
    <path d="M4 20.5v-5h5M20 3.5v5h-5" />
  </Icon>
);

export const IconArrowUp = (p) => (
  <Icon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
);

export const IconArrowDown = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Icon>
);

export const IconMinus = (p) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);

export const IconPaperclip = (p) => (
  <Icon {...p}>
    <path d="m20 8.5-8.4 8.4a4 4 0 0 1-5.7-5.7l8.5-8.5a2.7 2.7 0 0 1 3.8 3.8l-8.5 8.5a1.3 1.3 0 0 1-1.9-1.9L15 6.5" />
  </Icon>
);

export const IconEmptyBox = (p) => (
  <Icon {...p}>
    <path d="M3.5 8.2 12 4l8.5 4.2v7.6L12 20l-8.5-4.2Z" />
    <path d="M3.5 8.2 12 12.4l8.5-4.2M12 12.4V20" />
  </Icon>
);
