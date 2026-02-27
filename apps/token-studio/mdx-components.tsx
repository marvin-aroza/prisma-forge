import type { ComponentType } from "react";

type MDXComponents = Record<string, ComponentType<any>>;

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <h1 className="doc-h1" {...props} />,
    h2: (props) => <h2 className="doc-h2" {...props} />,
    p: (props) => <p className="doc-p" {...props} />,
    pre: (props) => <pre className="doc-pre" {...props} />,
    code: (props) => <code className="doc-code" {...props} />,
    ...components
  };
}
