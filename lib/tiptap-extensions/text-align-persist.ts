import { TextAlign } from "@tiptap/extension-text-align";

/**
 * Custom TextAlign extension that persists alignment across new paragraphs
 * When Enter is pressed, the new paragraph inherits the alignment from the previous one
 */
export const TextAlignPersist = TextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment || "left",
            parseHTML: (element) => {
              const align = element.style.textAlign || this.options.defaultAlignment || "left";
              return align;
            },
            renderHTML: (attributes) => {
              if (!attributes.textAlign) {
                return {};
              }

              return {
                style: `text-align: ${attributes.textAlign}`,
              };
            },
          },
        },
      },
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        // Alignment persistence is handled via transaction events in the editor component
        // Let default Enter behavior proceed
        return false;
      },
    };
  },
});
