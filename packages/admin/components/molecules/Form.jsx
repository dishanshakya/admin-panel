"use client";

import { createContext, useContext } from "react";

export const DefaultsContext = createContext(null); // null = "no Form ancestor"

export function Form({ children, onSubmit, className, defaults = {}, ...rest }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target, e.nativeEvent.submitter);
    const values = Object.fromEntries(formData.entries());
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
