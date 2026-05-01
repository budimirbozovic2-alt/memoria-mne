import DOMPurify from "dompurify";

/**
 * Sanitize HTML to prevent XSS attacks.
 * Allows safe formatting tags but strips scripts, event handlers,
