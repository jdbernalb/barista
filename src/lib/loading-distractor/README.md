# Loading distractor & loading spinner

<docs-source-example example="DefaultLoadingDistractorExampleComponent"></docs-source-example>

`<dt-loading-spinner>` and `<dt-loading-distractor>` are a circular indicators of activity (eg. loading).

## Progress spinner

<docs-source-example example="SpinnerLoadingDistractorExampleComponent"></docs-source-example>

**NOTE:**

Spinner inside input field will be supported once input fields are in place.

## Progress distractor

The `<dt-loading-distractor>` wraps the spinner and adds a label next to it.

### Options & Properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `ng-content` | `string` (html content) | `-` | Defines the label of the loading distractor |

## Accessibility

Each `<dt-loading-spinner>` should be given a meaningful label via `aria-label` or `aria-labelledby`.
`<dt-loading-distractor>` will set the aria-labelledby attributes automatically.