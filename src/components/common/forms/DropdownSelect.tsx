import { createPortal } from 'react-dom';
import { memo, useState, type CSSProperties, type ReactNode } from 'react';
import { useAnchoredDropdown } from '../../../hooks/useAnchoredDropdown';
import { playSound } from '../../../hooks/useSound';
import { FoaeCefUIAssetPath } from '../../../utils/assets';
import './DropdownSelect.css';

type DropdownPosition = 'inline' | 'below-right' | 'below-left';

export interface DropdownSelectOption {
  value: string;
  label: ReactNode;
  icon?: string;
  swatch?: string;
  meta?: ReactNode;
}

interface DropdownSelectProps {
  id: string;
  label?: ReactNode;
  value: string;
  options: DropdownSelectOption[];
  icon?: string;
  className?: string;
  labelClassName?: string;
  triggerClassName?: string;
  triggerActiveClassName?: string;
  textClassName?: string;
  chevronClassName?: string;
  menuClassName?: string;
  menuClosingClassName?: string;
  optionClassName?: string;
  optionActiveClassName?: string;
  optionIconClassName?: string;
  optionTextClassName?: string;
  optionMetaClassName?: string;
  swatchClassName?: string;
  escapeId?: string;
  isActive?: boolean;
  position?: DropdownPosition;
  portal?: boolean;
  offset?: number;
  useRootRem?: boolean;
  minSpaceBelow?: number;
  maxPopupHeight?: number;
  closeOnScroll?: boolean;
  durationMs?: number;
  stopPropagation?: boolean;
  showSelectedMeta?: boolean;
  placeholder?: ReactNode;
  renderValue?: (option: DropdownSelectOption | undefined) => ReactNode;
  renderOption?: (option: DropdownSelectOption, active: boolean) => ReactNode;
  onChange: (value: string) => void;
}

const DROPDOWN_SELECT_EXIT_MS = 120;

function classNames(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ');
}

const DropdownSelect = memo(function DropdownSelect({
  id,
  label,
  value,
  options,
  icon,
  className,
  labelClassName,
  triggerClassName,
  triggerActiveClassName,
  textClassName,
  chevronClassName,
  menuClassName,
  menuClosingClassName,
  optionClassName,
  optionActiveClassName,
  optionIconClassName,
  optionTextClassName,
  optionMetaClassName,
  swatchClassName,
  escapeId,
  isActive,
  position = 'inline',
  portal = false,
  offset = 4,
  useRootRem = false,
  minSpaceBelow = 160,
  maxPopupHeight = 280,
  closeOnScroll = false,
  durationMs = DROPDOWN_SELECT_EXIT_MS,
  stopPropagation = false,
  showSelectedMeta = false,
  placeholder,
  renderValue,
  renderOption,
  onChange,
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const {
    mounted,
    closing,
    style,
    setTriggerRef,
    setPopupRef,
    computePosition,
  } = useAnchoredDropdown({
    open,
    onClose: () => setOpen(false),
    durationMs,
    position,
    offset,
    useRootRem,
    minSpaceBelow,
    maxPopupHeight,
    closeOnScroll,
    escapeId: escapeId ?? `dropdown.select.${id}`,
    allowFromInput: true,
  });

  const selected = options.find(option => option.value === value) ?? options[0];
  const selectedIcon = selected?.icon ?? icon;
  const active = isActive ?? Boolean(selected && selected.value !== options[0]?.value);
  const triggerContent = renderValue ? renderValue(selected) : (
    <>
      {selectedIcon && (
        <img
          src={FoaeCefUIAssetPath(selectedIcon)}
          alt=""
          className={classNames('dropdown-select__icon', optionIconClassName)}
          draggable={false}
          onError={(event) => {
            if (icon) event.currentTarget.src = FoaeCefUIAssetPath(icon);
          }}
        />
      )}
      {selected?.swatch && <span className={classNames('dropdown-select__swatch', swatchClassName)} style={{ backgroundColor: selected.swatch }} />}
      <span className={classNames('dropdown-select__text', textClassName)}>{selected?.label ?? placeholder ?? ''}</span>
      {showSelectedMeta && selected?.meta && <span className={classNames('dropdown-select__meta', optionMetaClassName)}>{selected.meta}</span>}
    </>
  );

  const menu = mounted ? (
    <div
      ref={setPopupRef}
      className={classNames(
        'dropdown-select__menu',
        menuClassName,
        closing && 'dropdown-select__menu--closing',
        closing && menuClosingClassName,
      )}
      style={style as CSSProperties}
    >
      {options.map(option => {
        const optionIcon = option.icon ?? icon;
        const optionActive = option.value === selected?.value;
        return (
          <button
            key={option.value}
            type="button"
            className={classNames(
              'dropdown-select__option',
              optionClassName,
              optionActive && 'dropdown-select__option--active',
              optionActive && optionActiveClassName,
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              if (stopPropagation) event.stopPropagation();
              playSound('click');
              onChange(option.value);
              setOpen(false);
            }}
          >
            {renderOption ? renderOption(option, optionActive) : (
              <>
                {optionIcon && (
                  <img
                    src={FoaeCefUIAssetPath(optionIcon)}
                    alt=""
                    className={classNames('dropdown-select__option-icon', optionIconClassName)}
                    draggable={false}
                    onError={(event) => {
                      if (icon) event.currentTarget.src = FoaeCefUIAssetPath(icon);
                    }}
                  />
                )}
                {option.swatch && <span className={classNames('dropdown-select__swatch', swatchClassName)} style={{ backgroundColor: option.swatch }} />}
                <span className={classNames('dropdown-select__option-text', optionTextClassName)}>{option.label}</span>
                {option.meta && <span className={classNames('dropdown-select__meta', optionMetaClassName)}>{option.meta}</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={classNames('dropdown-select', open && 'dropdown-select--open', className)}>
      {label && <span className={classNames('dropdown-select__label', labelClassName)}>{label}</span>}
      <button
        ref={setTriggerRef}
        type="button"
        className={classNames(
          'dropdown-select__trigger',
          triggerClassName,
          active && 'dropdown-select__trigger--active',
          active && triggerActiveClassName,
        )}
        onMouseDown={(event) => {
          event.preventDefault();
          if (stopPropagation) event.stopPropagation();
          playSound('tab');
          if (open) {
            setOpen(false);
            return;
          }
          computePosition();
          setOpen(true);
        }}
      >
        {triggerContent}
        <img src={FoaeCefUIAssetPath('/assets/icons/I_DropdownChevron.png')} alt="" className={classNames('dropdown-select__chevron', chevronClassName)} draggable={false} />
      </button>
      {menu && (portal ? createPortal(menu, document.body) : menu)}
    </div>
  );
});

export default DropdownSelect;
