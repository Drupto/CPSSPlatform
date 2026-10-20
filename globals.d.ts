// Type declarations for CSS imports.
// Next.js handles .css files natively, but TypeScript needs an explicit
// module declaration so side-effect imports like `import './globals.css'`
// type-check cleanly (see `npm run typecheck`).
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
