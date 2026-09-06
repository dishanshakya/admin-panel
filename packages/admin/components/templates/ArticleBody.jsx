"use client";

import parse, { attributesToProps, domToReact } from "html-react-parser";

const options = {
  replace(domNode) {
    if (domNode.type !== "tag") return;

    if (domNode.name === "colgroup" || domNode.name === "col") {
      return <></>;
    }

    if (domNode.name === "table") {
      return (
        <div className="table-wrapper">
          <table {...attributesToProps(domNode.attribs)}>
            {domToReact(domNode.children, options)}
          </table>
        </div>
      );
    }

    /*
    if (domNode.name === 'span') {
      return <>{domToReact(domNode.children, options)}</>;
    }*/
  },
};
export default function ArticleBody({ html }) {
  if (!html) return null;

  return (
    <div className="text-(--text-nm) [&_a]:inline [&_h1]:my-6 [&_h2]:my-5 [&_h2]:text-3xl [&_h2]:font-bold [&_h3]:my-(--text-md) [&_h3]:text-(--text-nm) [&_p]:my-4 [&_td]:px-1.25 [&_td]:py-2.5 [&_th]:px-1.25 [&_th]:py-2.5">
      {parse(html, options)}
    </div>
  );
}
