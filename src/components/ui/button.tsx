import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#1B4332] text-[#FAF7F2] shadow-sm hover:bg-[#14241B] active:scale-[0.99]",
        secondary:
          "bg-[#F2ECE1] text-[#14241B] border border-[#2D4A3E]/20 hover:bg-[#EAE0CF]",
        outline:
          "bg-white text-[#14241B] border border-[#2D4A3E]/25 hover:bg-[#F2ECE1]",
        turmeric:
          "bg-[#FEF3C7] text-[#78350F] border border-[#D97706]/30 hover:bg-[#FDE68A]",
        success:
          "bg-[#248A3D] text-white shadow-sm hover:bg-[#1E7232]",
      },
      size: {
        default: "h-9 px-4 py-2",
        lg: "h-10 px-5 py-2.5 text-sm",
        chip: "h-8 px-3.5 py-1 rounded-full text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
