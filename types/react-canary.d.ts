/*
 * Turns on the type declarations for React's canary APIs.
 *
 * App Router already runs on React's canary channel — Next swaps the bundled
 * build in at compile time, which is why <ViewTransition> exists at runtime
 * without react@canary being installed. The types are not swapped with it:
 * @types/react keeps them in a separate entry point that nothing includes by
 * default, so without this reference TypeScript reports ViewTransition as a
 * missing export of a module that does in fact export it.
 *
 * Needed by Yumi Cosmic Mode's deck-to-room travel — see
 * components/cosmic/CosmicRouteStage.tsx.
 */
/// <reference types="react/canary" />
