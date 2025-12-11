/**
 * Mock implementations of Radix UI primitives for testing in JSDOM
 * These components render simple HTML equivalents that can be tested without browser APIs
 */
import React from 'react';
import { vi } from 'vitest';

// ============================================================================
// @radix-ui/react-select
// ============================================================================

const SelectContext = React.createContext<any>({});

export const SelectRoot = ({ children, onValueChange, value, defaultValue, onOpenChange, ...props }: any) => {
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || '');
  const [isOpen, setIsOpen] = React.useState(false);

  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setIsOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const contextValue = {
    value: currentValue,
    onValueChange: handleValueChange,
    open: isOpen,
    onOpenChange: handleOpenChange,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div data-testid="select-root" data-value={currentValue} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = React.forwardRef(({ children, onClick, ...props }: any, ref: any) => {
  const context = React.useContext(SelectContext);

  const handleClick = (e: any) => {
    context?.onOpenChange?.(!context.open);
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="combobox"
      aria-expanded={context?.open || false}
      data-testid="select-trigger"
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue = ({ children, placeholder }: any) => {
  const context = React.useContext(SelectContext);
  return (
    <span data-testid="select-value">
      {context?.value ? children : placeholder}
    </span>
  );
};

export const SelectContent = ({ children, position, ...props }: any) => {
  // Don't check open state here - let SelectPortal handle visibility
  return (
    <div role="listbox" data-testid="select-content" data-position={position} {...props}>
      {children}
    </div>
  );
};

export const SelectViewport = ({ children, ...props }: any) => (
  <div data-testid="select-viewport" {...props}>{children}</div>
);

export const SelectItem = React.forwardRef(({ children, value, disabled, onSelect, onClick, ...props }: any, ref: any) => {
  const context = React.useContext(SelectContext);

  const handleClick = (e: any) => {
    if (!disabled) {
      context?.onValueChange?.(value);
      onSelect?.();
      onClick?.(e);
    }
  };

  const isSelected = context?.value === value;

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      data-testid={`select-item-${value}`}
      data-value={value}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
});
SelectItem.displayName = 'SelectItem';

export const SelectItemText = ({ children }: any) => (
  <span data-testid="select-item-text">{children}</span>
);

export const SelectItemIndicator = ({ children }: any) => (
  <span data-testid="select-item-indicator">{children}</span>
);

export const SelectGroup = ({ children }: any) => (
  <div role="group" data-testid="select-group">
    {children}
  </div>
);

export const SelectLabel = ({ children }: any) => (
  <div data-testid="select-label">{children}</div>
);

export const SelectSeparator = () => <div data-testid="select-separator" role="separator" />;

export const SelectScrollUpButton = ({ children, ...props }: any) => (
  <div data-testid="select-scroll-up" {...props}>{children}</div>
);

export const SelectScrollDownButton = ({ children, ...props }: any) => (
  <div data-testid="select-scroll-down" {...props}>{children}</div>
);

export const SelectIcon = ({ children, asChild }: any) => {
  if (asChild && React.isValidElement(children)) {
    return children;
  }
  return <span data-testid="select-icon">{children}</span>;
};

export const SelectPortal = ({ children }: any) => {
  const context = React.useContext(SelectContext);
  // Only render portal children when select is open
  if (!context?.open) return null;
  return <>{children}</>;
};

// ============================================================================
// @radix-ui/react-dialog
// ============================================================================

const DialogContext = React.createContext<any>({});

export const DialogRoot = ({ children, open, onOpenChange, defaultOpen }: any) => {
  const [isOpen, setIsOpen] = React.useState(open !== undefined ? open : defaultOpen || false);

  const currentOpen = open !== undefined ? open : isOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) {
      setIsOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const contextValue = {
    open: currentOpen,
    onOpenChange: handleOpenChange,
  };

  return (
    <DialogContext.Provider value={contextValue}>
      <div data-testid="dialog-root" data-state={currentOpen ? 'open' : 'closed'}>
        {children}
      </div>
    </DialogContext.Provider>
  );
};

export const DialogTrigger = React.forwardRef(({ children, asChild, onClick, ...props }: any, ref: any) => {
  const context = React.useContext(DialogContext);

  const handleClick = (e: any) => {
    context?.onOpenChange?.(true);
    onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref, onClick: handleClick, ...props } as any);
  }

  return (
    <button ref={ref} data-testid="dialog-trigger" onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
DialogTrigger.displayName = 'DialogTrigger';

export const DialogPortal = ({ children }: any) => {
  const context = React.useContext(DialogContext);
  if (!context?.open) return null;
  return <>{children}</>;
};

export const DialogOverlay = React.forwardRef((props: any, ref: any) => (
  <div ref={ref} data-testid="dialog-overlay" {...props} />
));
DialogOverlay.displayName = 'DialogOverlay';

export const DialogContent = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} role="dialog" aria-modal="true" data-testid="dialog-content" {...props}>
    {children}
  </div>
));
DialogContent.displayName = 'DialogContent';

export const DialogTitle = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <h2 ref={ref} data-testid="dialog-title" {...props}>
    {children}
  </h2>
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <p ref={ref} data-testid="dialog-description" {...props}>
    {children}
  </p>
));
DialogDescription.displayName = 'DialogDescription';

export const DialogClose = React.forwardRef(({ children, asChild, onClick, ...props }: any, ref: any) => {
  const context = React.useContext(DialogContext);

  const handleClick = (e: any) => {
    context?.onOpenChange?.(false);
    onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref, onClick: handleClick, ...props } as any);
  }

  return (
    <button ref={ref} data-testid="dialog-close" onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
DialogClose.displayName = 'DialogClose';

// ============================================================================
// @radix-ui/react-popover
// ============================================================================

const PopoverContext = React.createContext<any>({});

export const PopoverRoot = ({ children, open, onOpenChange, defaultOpen }: any) => {
  const [isOpen, setIsOpen] = React.useState(open !== undefined ? open : defaultOpen || false);

  const currentOpen = open !== undefined ? open : isOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) {
      setIsOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const contextValue = {
    open: currentOpen,
    onOpenChange: handleOpenChange,
  };

  return (
    <PopoverContext.Provider value={contextValue}>
      <div data-testid="popover-root" data-state={currentOpen ? 'open' : 'closed'}>
        {children}
      </div>
    </PopoverContext.Provider>
  );
};

export const PopoverTrigger = React.forwardRef(({ children, asChild, onClick, ...props }: any, ref: any) => {
  const context = React.useContext(PopoverContext);

  const handleClick = (e: any) => {
    context?.onOpenChange?.(!context.open);
    onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref, onClick: handleClick, ...props } as any);
  }

  return (
    <button ref={ref} data-testid="popover-trigger" onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
PopoverTrigger.displayName = 'PopoverTrigger';

export const PopoverPortal = ({ children }: any) => {
  const context = React.useContext(PopoverContext);
  if (!context?.open) return null;
  return <>{children}</>;
};

export const PopoverContent = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} role="dialog" data-testid="popover-content" {...props}>
    {children}
  </div>
));
PopoverContent.displayName = 'PopoverContent';

export const PopoverAnchor = React.forwardRef((props: any, ref: any) => (
  <div ref={ref} data-testid="popover-anchor" {...props} />
));
PopoverAnchor.displayName = 'PopoverAnchor';

export const PopoverClose = React.forwardRef(({ children, onClick, ...props }: any, ref: any) => {
  const context = React.useContext(PopoverContext);

  const handleClick = (e: any) => {
    context?.onOpenChange?.(false);
    onClick?.(e);
  };

  return (
    <button ref={ref} data-testid="popover-close" onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
PopoverClose.displayName = 'PopoverClose';

export const PopoverArrow = React.forwardRef((props: any, ref: any) => (
  <div ref={ref} data-testid="popover-arrow" {...props} />
));
PopoverArrow.displayName = 'PopoverArrow';

// ============================================================================
// @radix-ui/react-dropdown-menu
// ============================================================================

const DropdownMenuContext = React.createContext<any>({});

export const DropdownMenuRoot = ({ children, open, onOpenChange, defaultOpen }: any) => {
  const [isOpen, setIsOpen] = React.useState(open !== undefined ? open : defaultOpen || false);

  const currentOpen = open !== undefined ? open : isOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) {
      setIsOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const contextValue = {
    open: currentOpen,
    onOpenChange: handleOpenChange,
  };

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <div data-testid="dropdown-menu-root" data-state={currentOpen ? 'open' : 'closed'}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger = React.forwardRef(({ children, asChild, onClick, ...props }: any, ref: any) => {
  const context = React.useContext(DropdownMenuContext);

  const handleClick = (e: any) => {
    context?.onOpenChange?.(!context.open);
    onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref, onClick: handleClick, ...props } as any);
  }

  return (
    <button ref={ref} data-testid="dropdown-menu-trigger" onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export const DropdownMenuPortal = ({ children }: any) => {
  const context = React.useContext(DropdownMenuContext);
  if (!context?.open) return null;
  return <>{children}</>;
};

export const DropdownMenuContent = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} role="menu" data-testid="dropdown-menu-content" {...props}>
    {children}
  </div>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef(({ children, onSelect, disabled, onClick, ...props }: any, ref: any) => {
  const context = React.useContext(DropdownMenuContext);

  const handleClick = (e: any) => {
    if (!disabled) {
      onSelect?.();
      context?.onOpenChange?.(false);
      onClick?.(e);
    }
  };

  return (
    <div
      ref={ref}
      role="menuitem"
      aria-disabled={disabled}
      data-testid="dropdown-menu-item"
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuCheckboxItem = React.forwardRef(
  ({ children, checked, onCheckedChange, onClick, ...props }: any, ref: any) => {
    const handleClick = (e: any) => {
      onCheckedChange?.(!checked);
      onClick?.(e);
    };

    return (
      <div
        ref={ref}
        role="menuitemcheckbox"
        aria-checked={checked}
        data-testid="dropdown-menu-checkbox-item"
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

export const DropdownMenuRadioGroup = ({ children, value }: any) => (
  <div role="group" data-testid="dropdown-menu-radio-group" data-value={value}>
    {children}
  </div>
);

export const DropdownMenuRadioItem = React.forwardRef(
  ({ children, value, onClick, ...props }: any, ref: any) => (
    <div
      ref={ref}
      role="menuitemradio"
      data-testid="dropdown-menu-radio-item"
      data-value={value}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
);
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

export const DropdownMenuLabel = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} data-testid="dropdown-menu-label" {...props}>
    {children}
  </div>
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = React.forwardRef((props: any, ref: any) => (
  <div ref={ref} role="separator" data-testid="dropdown-menu-separator" {...props} />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export const DropdownMenuSub = ({ children }: any) => (
  <div data-testid="dropdown-menu-sub">{children}</div>
);

export const DropdownMenuSubTrigger = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} data-testid="dropdown-menu-sub-trigger" {...props}>
    {children}
  </div>
));
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

export const DropdownMenuSubContent = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} role="menu" data-testid="dropdown-menu-sub-content" {...props}>
    {children}
  </div>
));
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

export const DropdownMenuGroup = ({ children }: any) => (
  <div role="group" data-testid="dropdown-menu-group">
    {children}
  </div>
);

export const DropdownMenuItemIndicator = ({ children }: any) => (
  <span data-testid="dropdown-menu-item-indicator">{children}</span>
);

export const DropdownMenuShortcut = ({ children, ...props }: any) => (
  <span data-testid="dropdown-menu-shortcut" {...props}>
    {children}
  </span>
);

// ============================================================================
// @radix-ui/react-context-menu
// ============================================================================

const ContextMenuContext = React.createContext<any>({});

export const ContextMenuRoot = ({ children, onOpenChange }: any) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const contextValue = {
    open: isOpen,
    onOpenChange: handleOpenChange,
  };

  return (
    <ContextMenuContext.Provider value={contextValue}>
      <div data-testid="context-menu-root" data-state={isOpen ? 'open' : 'closed'}>
        {children}
      </div>
    </ContextMenuContext.Provider>
  );
};

export const ContextMenuTrigger = React.forwardRef(({ children, asChild, onContextMenu, ...props }: any, ref: any) => {
  const context = React.useContext(ContextMenuContext);

  const handleContextMenu = (e: any) => {
    e.preventDefault();
    context?.onOpenChange?.(true);
    onContextMenu?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref, onContextMenu: handleContextMenu, ...props } as any);
  }

  return (
    <div ref={ref} data-testid="context-menu-trigger" onContextMenu={handleContextMenu} {...props}>
      {children}
    </div>
  );
});
ContextMenuTrigger.displayName = 'ContextMenuTrigger';

export const ContextMenuPortal = ({ children }: any) => {
  const context = React.useContext(ContextMenuContext);
  if (!context?.open) return null;
  return <>{children}</>;
};

export const ContextMenuContent = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} role="menu" data-testid="context-menu-content" {...props}>
    {children}
  </div>
));
ContextMenuContent.displayName = 'ContextMenuContent';

export const ContextMenuItem = React.forwardRef(({ children, onSelect, onClick, ...props }: any, ref: any) => {
  const context = React.useContext(ContextMenuContext);

  const handleClick = (e: any) => {
    onSelect?.();
    context?.onOpenChange?.(false);
    onClick?.(e);
  };

  return (
    <div
      ref={ref}
      role="menuitem"
      data-testid="context-menu-item"
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
});
ContextMenuItem.displayName = 'ContextMenuItem';

export const ContextMenuCheckboxItem = React.forwardRef(
  ({ children, checked, onCheckedChange, onClick, ...props }: any, ref: any) => {
    const handleClick = (e: any) => {
      onCheckedChange?.(!checked);
      onClick?.(e);
    };

    return (
      <div
        ref={ref}
        role="menuitemcheckbox"
        aria-checked={checked}
        data-testid="context-menu-checkbox-item"
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ContextMenuCheckboxItem.displayName = 'ContextMenuCheckboxItem';

export const ContextMenuRadioGroup = ({ children, value }: any) => (
  <div role="group" data-testid="context-menu-radio-group" data-value={value}>
    {children}
  </div>
);

export const ContextMenuRadioItem = React.forwardRef(({ children, value, onClick, ...props }: any, ref: any) => (
  <div
    ref={ref}
    role="menuitemradio"
    data-testid="context-menu-radio-item"
    data-value={value}
    onClick={onClick}
    {...props}
  >
    {children}
  </div>
));
ContextMenuRadioItem.displayName = 'ContextMenuRadioItem';

export const ContextMenuLabel = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} data-testid="context-menu-label" {...props}>
    {children}
  </div>
));
ContextMenuLabel.displayName = 'ContextMenuLabel';

export const ContextMenuSeparator = React.forwardRef((props: any, ref: any) => (
  <div ref={ref} role="separator" data-testid="context-menu-separator" {...props} />
));
ContextMenuSeparator.displayName = 'ContextMenuSeparator';

export const ContextMenuSub = ({ children }: any) => (
  <div data-testid="context-menu-sub">{children}</div>
);

export const ContextMenuSubTrigger = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} data-testid="context-menu-sub-trigger" {...props}>
    {children}
  </div>
));
ContextMenuSubTrigger.displayName = 'ContextMenuSubTrigger';

export const ContextMenuSubContent = React.forwardRef(({ children, ...props }: any, ref: any) => (
  <div ref={ref} role="menu" data-testid="context-menu-sub-content" {...props}>
    {children}
  </div>
));
ContextMenuSubContent.displayName = 'ContextMenuSubContent';

export const ContextMenuGroup = ({ children }: any) => (
  <div role="group" data-testid="context-menu-group">
    {children}
  </div>
);

// ============================================================================
// Mock setup for vitest
// ============================================================================

vi.mock('@radix-ui/react-select', () => ({
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Content: SelectContent,
  Viewport: SelectViewport,
  Item: SelectItem,
  ItemText: SelectItemText,
  ItemIndicator: SelectItemIndicator,
  Group: SelectGroup,
  Label: SelectLabel,
  Separator: SelectSeparator,
  ScrollUpButton: SelectScrollUpButton,
  ScrollDownButton: SelectScrollDownButton,
  Icon: SelectIcon,
  Portal: SelectPortal,
}));

vi.mock('@radix-ui/react-dialog', () => ({
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
}));

vi.mock('@radix-ui/react-popover', () => ({
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Content: PopoverContent,
  Anchor: PopoverAnchor,
  Close: PopoverClose,
  Arrow: PopoverArrow,
}));

vi.mock('@radix-ui/react-dropdown-menu', () => ({
  Root: DropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  Portal: DropdownMenuPortal,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  CheckboxItem: DropdownMenuCheckboxItem,
  RadioGroup: DropdownMenuRadioGroup,
  RadioItem: DropdownMenuRadioItem,
  Label: DropdownMenuLabel,
  Separator: DropdownMenuSeparator,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
  Group: DropdownMenuGroup,
  ItemIndicator: DropdownMenuItemIndicator,
  Shortcut: DropdownMenuShortcut,
}));

vi.mock('@radix-ui/react-context-menu', () => ({
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Portal: ContextMenuPortal,
  Content: ContextMenuContent,
  Item: ContextMenuItem,
  CheckboxItem: ContextMenuCheckboxItem,
  RadioGroup: ContextMenuRadioGroup,
  RadioItem: ContextMenuRadioItem,
  Label: ContextMenuLabel,
  Separator: ContextMenuSeparator,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
  Group: ContextMenuGroup,
}));
