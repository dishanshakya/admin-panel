"use client";

import { createContext, useContext } from "react";

export const DefaultsContext = createContext(null); // null = "no Form ancestor"

export function Form({ children, onSubmit, className, defaults = {}, ...rest }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target, e.nativeEvent.submitter);

    const values = {};
    for (const key of new Set(formData.keys())) {
      const isArrayField = key.endsWith("[]");
      const cleanKey = isArrayField ? key.slice(0, -2) : key;
      const all = formData.getAll(key);

      values[cleanKey] = isArrayField ? all : (all.length > 1 ? all : all[0]);
    }

    onSubmit(values);
  };

  return (
    <DefaultsContext.Provider value={defaults}>
      <form onSubmit={handleSubmit} className={`${className}`} {...rest}>
        {children}
      </form>
    </DefaultsContext.Provider>
  );
}
