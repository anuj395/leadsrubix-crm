# Coding Standards & Guidelines

This document outlines the standard coding practices and syntax guidelines for the project.

## 1. General Principles
* **Type Safety**: TypeScript must be used for all new frontend components and services. Avoid using `any` whenever possible.
* **Asynchronous Operations**: Prefer using async/await syntax over promise chains (`.then`/`.catch`) for readability and better error handling.
* **Component Design**: Keep UI components highly cohesive and single-purpose. Separate presentation from data-fetching hooks.

## 2. Formatting & Syntax
* Indentation must be set to 2 spaces.
* Single quotes should be used for strings.
* Semi-colons are mandatory at the end of statements.
