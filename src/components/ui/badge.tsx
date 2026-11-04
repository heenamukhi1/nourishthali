import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[#F2ECE1] text-[#14241B] border border-[#2D4A3E]/15",
        forest: "bg-[#1B4332] text-[#FAF7F2]",
        turmeric:
          "bg-[#FEF3C7] text-[#78350F] border border-[#D97706]/25",
        mint: "bg-[#D8E6DF] text-[#1B4332] border border-[#1B4332]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
