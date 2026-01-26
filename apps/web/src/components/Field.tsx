import type React from 'react';

type FieldProps = {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  name?: string;
  required?: boolean;
};

export default function Field({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  name,
  required,
}: FieldProps) {
  return (
    <label className="form__label">
      {label}
      <input
        className="form__input"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        name={name}
        required={required}
      />
    </label>
  );
}
