"use client";
import Select, { components } from "react-select";
import { useMemo } from "react";

export default function SiteSelect({
  options = [],
  value = [],
  onChange,
  max = 3,
  disabled = false,
  className = "",             
  placeholder = "Pilih site (max 3)",
}) {
  const styles = useMemo(() => ({
    container: (b) => ({ ...b, width: "100%" }),
    control: (b, s) => ({
      ...b,
      minHeight: 34,
      height: 34,
      background: "#22263a",
      borderColor: s.isFocused ? "#7c7f9a" : "#2f334b",
      borderRadius: 10,
      boxShadow: "none",
      cursor: disabled ? "not-allowed" : "text",
      opacity: disabled ? 0.6 : 1,
    }),
    valueContainer: (b) => ({
      ...b,
      padding: "0 6px",
      gap: 4,
      display: "flex",
      flexWrap: "nowrap",
      overflowX: "auto",
      scrollbarWidth: "none",
    }),
    placeholder: (b) => ({ ...b, fontSize: 12, color: "#9aa3b2" }),
    multiValue: (b) => ({
      ...b,
      background: "#2b2f48",
      borderRadius: 8,
      alignItems: "center",
    }),
    multiValueLabel: (b) => ({
      ...b,
      color: "#f8fafc",
      fontWeight: 700,
      fontSize: 10,
      maxWidth: 95,              
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      padding: "2px 6px",
    }),
    multiValueRemove: (b) => ({
      ...b,
      padding: "0 6px",
      color: "#cbd5e1",
      ":hover": { background: "transparent", color: "#fda4af" },
    }),
    indicatorsContainer: (b) => ({ ...b, height: 34 }),
    clearIndicator: (b) => ({ ...b, padding: 6 }),
    dropdownIndicator: (b) => ({ ...b, padding: 6 }),
    menuPortal: (b) => ({ ...b, zIndex: 99999 }),           
    menu: (b) => ({
      ...b,
      zIndex: 99999,
      background: "#101426",
      border: "1px solid #2f334b",
      boxShadow: "0 12px 30px rgba(0,0,0,.45)",
      overflow: "hidden",
    }),
    menuList: (b) => ({ ...b, maxHeight: 220, padding: 6 }),
    option: (b, s) => ({
      ...b,
      background: s.isSelected ? "#7c3aed" : s.isFocused ? "#2a3150" : "transparent",
      color: "#e5e7eb",
      fontSize: 12,
      borderRadius: 6,
      padding: "8px 10px",
    }),
  }), [disabled]);

  const DropdownIndicator = (props) => (
    <components.DropdownIndicator {...props}>
      <span style={{ fontSize: 12 }}>▾</span>
    </components.DropdownIndicator>
  );
  const ClearIndicator = (props) => (
    <components.ClearIndicator {...props}>
      <span style={{ fontSize: 12 }}>×</span>
    </components.ClearIndicator>
  );

  const Remaining = ({ max, count }) => {
    const left = Math.max(0, max - (count || 0));
    if (left === 0) return null;
    return (
      <span className="ml-2 inline-flex h-5 px-2 items-center rounded-md text-[10px] font-bold
                       bg-white/10 text-white/80 border border-white/15">
        {left} left
      </span>
    );
  };

  const filterOption = (opt, raw) => {
    const q = (raw || "").toLowerCase().trim();
    return opt.label.toLowerCase().includes(q);
  };

  return (
    <div className={`flex items-center ${className}`}>
      <Select
        isMulti
        isDisabled={disabled}
        options={options}
        value={value}
        onChange={(vals) => {
          const v = Array.from(vals || []);
          if (v.length <= max) onChange?.(v);
        }}
        placeholder={placeholder}
        classNamePrefix="react-select"
        filterOption={filterOption}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        maxMenuHeight={220}
        
        menuPortalTarget={typeof window !== "undefined" ? document.body : null}
        menuPosition="fixed"
        menuPlacement="bottom"
        styles={styles}
        components={{ DropdownIndicator, ClearIndicator }}
        noOptionsMessage={() => "Tidak ada hasil"}
        isOptionDisabled={(_, vals) => (vals?.length || 0) >= max}
      />
      <Remaining max={max} count={value?.length} />
    </div>
  );
}
