# fluid-button

This is an experimental button element built with lit-elements and
web-components. It registers itself as `fluid-button` custom element.

## Properties

| Property   | Attribute  | Type                                   | Default   | Description                               |
| ---------- | ---------- | -------------------------------------- | --------- | ----------------------------------------- |
| `color`    | `color`    | `'main' \| 'warning' \| 'cta'`         | "main"    | Defines the color theme of the button.    |
| `disabled` | `disabled` | `boolean\|undefined`                   | false     | Defines if the button is disabled or not. |
| `variant`  | `variant`  | `'primary' \| 'secondary' \| 'nested'` | "primary" | Defines the variant of the button.        |

## Slots

| Name | Description                                                      |
| ---- | ---------------------------------------------------------------- |
|      | The content of the button will be put inside the button element. |

## CSS Custom Properties

| Property                              | Description                                                   |
| ------------------------------------- | ------------------------------------------------------------- |
| `--fluid-button--background`          | Controls the default background color.                        |
| `--fluid-button--background-active`   | Controls the background color of the button in active mode.   |
| `--fluid-button--background-disabled` | Controls the background color of the button in disabled mode. |
| `--fluid-button--background-hover`    | Controls the background color of the button in hover mode.    |
| `--fluid-button--border-radius`       | Controls the border radius of the button.                     |
| `--fluid-button--border-style`        | Controls the border style of the button.                      |
| `--fluid-button--border-width`        | Controls the border width of the button.                      |
| `--fluid-button--foreground`          | Controls the default foreground color.                        |
| `--fluid-button--foreground-active`   | Controls the foreground color of the button in active mode.   |
| `--fluid-button--foreground-disabled` | Controls the foreground color of the button in disabled mode. |
| `--fluid-button--foreground-hover`    | Controls the foreground color of the button in hover mode.    |
| `--fluid-button--height`              | Controls the height of the button.                            |
| `--fluid-button--padding`             | Controls the inner padding of the button.                     |
