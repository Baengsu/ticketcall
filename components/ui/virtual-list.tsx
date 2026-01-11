// 27.1 components/ui/virtual-list.tsx
"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

type VirtualListProps<T> = {
  items: T[];
  estimateSize?: number; // px
  height?: number | string; // px or css value
  overscan?: number;
  className?: string;
  itemKey?: (item: T, index: number) => React.Key;
  renderRow: (item: T, index: number) => React.ReactNode;
};

export function VirtualList<T>({
  items,
  estimateSize = 72,
  height = "70vh",
  overscan = 10,
  className,
  itemKey,
  renderRow,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className={`w-full overflow-auto ${className ?? ""}`}
      style={{ height }}
    >
      <div style={{ height: totalSize, position: "relative" }}>
        {virtualItems.map((v) => {
          const item = items[v.index]!;
          const key = itemKey ? itemKey(item, v.index) : v.key;

          return (
            <div
              key={key}
              data-index={v.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${v.start}px)`,
              }}
            >
              {renderRow(item, v.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

