# Grafana Panel Settings System - Educational Guide

## Overview
This document explains how Grafana plugins define and use panel settings (also called "panel options") that appear in the Grafana GUI. It's the system that lets users customize your plugin's behavior without writing code.

---

## The Big Picture: How Panel Settings Work

### The Flow
```
1. Developer defines options in code (module.ts)
        ↓
2. Grafana renders these as UI controls in the settings panel
        ↓
3. User adjusts settings in Grafana GUI
        ↓
4. Grafana stores the values in the dashboard JSON
        ↓
5. Your panel component receives these values as props
        ↓
6. Your component uses these values to change behavior/appearance
```

---

## Part 1: Defining Panel Options (module.ts)

### The Core File: `module.ts`
This is where you tell Grafana "what settings should exist for this panel."

### Real Example from Your Codebase

```typescript
// module.ts
import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel)
  .setPanelOptions((builder) => {
    return builder
      .addTextInput({
        path: 'text',
        name: 'Simple text option',
        description: 'Description of panel option',
        defaultValue: 'Default value of text input option',
      })
      .addBooleanSwitch({
        path: 'showSeriesCount',
        name: 'Show series counter',
        defaultValue: false,
      })
      .addRadio({
        path: 'seriesCountSize',
        defaultValue: 'sm',
        name: 'Series counter size',
        settings: {
          options: [
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ],
        },
        showIf: (config) => config.showSeriesCount,
      });
  });
```

### Understanding the Code

#### 1. **PanelPlugin Constructor**
```typescript
new PanelPlugin<SimpleOptions>(SimplePanel)
```
- Creates a new panel plugin
- `<SimpleOptions>` is the TypeScript interface defining your options structure
- `SimplePanel` is your React component that will render the panel

#### 2. **setPanelOptions Method**
```typescript
.setPanelOptions((builder) => { ... })
```
- This is where you define what settings appear in the GUI
- `builder` is an object with methods to add different types of controls
- Returns the modified builder (allows method chaining)

#### 3. **Builder Methods** (The Settings Types)

Grafana provides many built-in editor types:

| Method | Creates | User Sees |
|--------|---------|-----------|
| `.addTextInput()` | Text field | Text input box |
| `.addBooleanSwitch()` | On/Off toggle | Toggle switch |
| `.addRadio()` | Radio buttons | Radio button group |
| `.addSelect()` | Dropdown menu | Select dropdown |
| `.addNumberInput()` | Number field | Number input box |
| `.addSliderInput()` | Slider | Range slider |
| `.addColorPicker()` | Color picker | Color selection UI |
| `.addFieldNamePicker()` | Field selector | Dropdown of data fields |

---

## Part 2: Typing Your Options (types.ts)

### The TypeScript Interface

For every setting you define, you need a TypeScript interface:

```typescript
// types.ts
type SeriesSize = 'sm' | 'md' | 'lg';

export interface SimpleOptions {
  text: string;                    // Corresponds to .addTextInput()
  showSeriesCount: boolean;        // Corresponds to .addBooleanSwitch()
  seriesCountSize: SeriesSize;     // Corresponds to .addRadio()
}
```

### Why This Matters
- **Type Safety**: TypeScript will catch errors if you try to use options incorrectly
- **Autocomplete**: Your IDE will suggest available options
- **Documentation**: The interface serves as documentation for what options exist

### The Connection
```typescript
// In module.ts, this line connects them:
new PanelPlugin<SimpleOptions>(SimplePanel)
//              ^^^^^^^^^^^^^ 
//              Your interface goes here
```

---

## Part 3: Using Options in Your Component

### How Your Component Receives Options

```typescript
// SimplePanel.tsx
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';

interface Props extends PanelProps<SimpleOptions> {}

export const SimplePanel: React.FC<Props> = ({ 
  options,    // ← YOUR SETTINGS ARE HERE!
  data, 
  width, 
  height 
}) => {
  // Now you can use: options.text, options.showSeriesCount, etc.
  
  return (
    <div>
      <h1>{options.text}</h1>
      {options.showSeriesCount && (
        <div style={{ fontSize: options.seriesCountSize === 'lg' ? '24px' : '12px' }}>
          Series Count: {data.series.length}
        </div>
      )}
    </div>
  );
};
```

### Understanding the Props

```typescript
interface PanelProps<TOptions> {
  options: TOptions;        // Your custom options
  data: PanelData;          // Data from queries
  width: number;            // Panel width
  height: number;           // Panel height
  timeRange: TimeRange;     // Selected time range
  timeZone: string;         // User's timezone
  // ... and more
}
```

---

## Part 4: Common Builder Options Explained

### Anatomy of a Builder Method

Every builder method accepts an object with common properties:

```typescript
.addTextInput({
  path: 'text',                    // Property name in your options interface
  name: 'Simple text option',      // Label shown in Grafana GUI
  description: 'Description...',   // Help text (optional)
  defaultValue: 'Default value',   // Initial value (optional)
  category: ['Display'],           // Group in categories (optional)
  showIf: (config) => true,        // Conditional visibility (optional)
})
```

### Key Properties

#### `path` (Required)
- The property name from your interface
- Must match exactly what's in your TypeScript interface
- Used to access the value: `options.text`

#### `name` (Required)
- The human-readable label shown in Grafana
- Appears above/next to the control
- Use clear, descriptive names

#### `description` (Optional)
- Help text or explanation
- Shows as a tooltip or below the control
- Good for complex options

#### `defaultValue` (Optional)
- Initial value when panel is first added
- If not specified, TypeScript's default for that type (undefined, false, 0, etc.)

#### `category` (Optional)
- Groups related options together
- Creates collapsible sections in the GUI
```typescript
.addTextInput({
  path: 'title',
  name: 'Title',
  category: ['Display'],  // Will be in "Display" section
})
```

#### `showIf` (Optional but Powerful!)
- Conditionally show/hide an option based on other options
- Receives current config, returns boolean
```typescript
.addRadio({
  path: 'seriesCountSize',
  name: 'Series counter size',
  showIf: (config) => config.showSeriesCount,  // Only show if toggle is ON
})
```

---

## Part 5: Advanced Patterns

### Pattern 1: Dependent Options (Conditional Display)

```typescript
export const plugin = new PanelPlugin<MyOptions>(MyPanel)
  .setPanelOptions((builder) => {
    return builder
      .addBooleanSwitch({
        path: 'enableAdvancedMode',
        name: 'Enable Advanced Features',
        defaultValue: false,
      })
      .addTextInput({
        path: 'advancedConfig',
        name: 'Advanced Configuration',
        showIf: (config) => config.enableAdvancedMode,  // Only visible when enabled
      });
  });
```

**Result**: The "Advanced Configuration" field only appears when the user toggles "Enable Advanced Features" ON.

### Pattern 2: Grouped Options with Categories

```typescript
export const plugin = new PanelPlugin<MyOptions>(MyPanel)
  .setPanelOptions((builder) => {
    return builder
      // Display category
      .addTextInput({
        path: 'title',
        name: 'Panel Title',
        category: ['Display'],
      })
      .addColorPicker({
        path: 'backgroundColor',
        name: 'Background Color',
        category: ['Display'],
      })
      // Data category
      .addSelect({
        path: 'aggregation',
        name: 'Aggregation Method',
        category: ['Data Processing'],
        settings: {
          options: [
            { value: 'sum', label: 'Sum' },
            { value: 'avg', label: 'Average' },
          ],
        },
      });
  });
```

**Result**: Options are organized into collapsible "Display" and "Data Processing" sections.

### Pattern 3: Dynamic Options Based on Data

```typescript
.addFieldNamePicker({
  path: 'selectedField',
  name: 'Field to Display',
  description: 'Choose which data field to visualize',
  // Grafana automatically populates this with fields from your data source
})
```

**Result**: The dropdown automatically shows all available fields from the user's query.

### Pattern 4: Multiple Choice with Select

```typescript
.addSelect({
  path: 'mapProvider',
  name: 'Map Provider',
  description: 'Choose which map tiles to use',
  defaultValue: 'openstreetmap',
  settings: {
    options: [
      { value: 'openstreetmap', label: 'OpenStreetMap' },
      { value: 'dark', label: 'Dark Mode' },
      { value: 'satellite', label: 'Satellite Imagery' },
    ],
  },
})
```

### Pattern 5: Numeric Ranges with Slider

```typescript
.addSliderInput({
  path: 'opacity',
  name: 'Globe Opacity',
  defaultValue: 1.0,
  settings: {
    min: 0,
    max: 1,
    step: 0.1,
  },
})
```

---

## Part 6: Example - Cesium Globe Settings

### How You Might Define Settings for a Cesium Globe Plugin

```typescript
// module.ts
export const plugin = new PanelPlugin<CesiumOptions>(CesiumPanel)
  .setPanelOptions((builder) => {
    return builder
      // Globe Appearance
      .addSelect({
        path: 'imageryProvider',
        name: 'Map Style',
        category: ['Globe Appearance'],
        defaultValue: 'bluemarble',
        settings: {
          options: [
            { value: 'bluemarble', label: 'Blue Marble' },
            { value: 'dark', label: 'Dark Theme' },
            { value: 'naturalearth', label: 'Natural Earth' },
          ],
        },
      })
      .addBooleanSwitch({
        path: 'showCountryLabels',
        name: 'Show Country Names',
        category: ['Globe Appearance'],
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'enableLighting',
        name: 'Realistic Sun Lighting',
        category: ['Globe Appearance'],
        description: 'Shows day/night based on current time',
        defaultValue: false,
      })
      // Camera Controls
      .addBooleanSwitch({
        path: 'showTimeline',
        name: 'Show Timeline',
        category: ['Controls'],
        defaultValue: false,
      })
      .addBooleanSwitch({
        path: 'showAnimation',
        name: 'Show Animation Controls',
        category: ['Controls'],
        defaultValue: false,
      })
      // Visualization
      .addColorPicker({
        path: 'markerColor',
        name: 'Marker Color',
        category: ['Visualization'],
        defaultValue: 'red',
      })
      .addSliderInput({
        path: 'markerSize',
        name: 'Marker Size',
        category: ['Visualization'],
        defaultValue: 10,
        settings: {
          min: 1,
          max: 50,
          step: 1,
        },
      });
  });
```

### Corresponding Types

```typescript
// types.ts
export interface CesiumOptions {
  // Globe Appearance
  imageryProvider: 'bluemarble' | 'dark' | 'naturalearth';
  showCountryLabels: boolean;
  enableLighting: boolean;
  
  // Controls
  showTimeline: boolean;
  showAnimation: boolean;
  
  // Visualization
  markerColor: string;
  markerSize: number;
}
```

### Using in Component

```typescript
// CesiumPanel.tsx
export const CesiumPanel: React.FC<Props> = ({ options, data, width, height }) => {
  return (
    <Viewer 
      full 
      timeline={options.showTimeline}
      animation={options.showAnimation}
    >
      <Globe 
        enableLighting={options.enableLighting}
        imageryProvider={getImageryProvider(options.imageryProvider)}
      />
      {data.series[0]?.fields.map((field, i) => (
        <Entity
          key={i}
          position={getPosition(field)}
          point={{
            pixelSize: options.markerSize,
            color: Color.fromCssColorString(options.markerColor),
          }}
        />
      ))}
    </Viewer>
  );
};
```

---

## Part 7: Where Grafana Stores These Values

### Behind the Scenes
When a user changes a setting in your panel:

1. **Dashboard JSON** - Grafana saves it to the dashboard's JSON model:
```json
{
  "panels": [
    {
      "type": "your-plugin-id",
      "options": {
        "text": "User's custom text",
        "showSeriesCount": true,
        "seriesCountSize": "lg"
      }
    }
  ]
}
```

2. **Persistence** - This is saved to:
   - Database (if using Grafana with DB)
   - JSON file (if using file-based provisioning)
   - Browser (if dashboard not saved)

3. **Restoration** - When dashboard loads, Grafana:
   - Reads the saved options
   - Passes them to your component as `props.options`
   - Your component renders based on these values

---

## Part 8: Best Practices

### ✅ DO

1. **Use Clear Names**
   ```typescript
   name: 'Show Country Names'  // ✅ Clear
   // vs
   name: 'CNT_LBL'            // ❌ Cryptic
   ```

2. **Provide Descriptions for Complex Options**
   ```typescript
   .addBooleanSwitch({
     path: 'enableLighting',
     name: 'Enable Lighting',
     description: 'Shows realistic sun position based on time range',  // Helpful!
   })
   ```

3. **Use `showIf` to Hide Irrelevant Options**
   ```typescript
   .addSliderInput({
     path: 'markerOpacity',
     name: 'Marker Opacity',
     showIf: (config) => config.showMarkers,  // Only relevant if markers are visible
   })
   ```

4. **Provide Sensible Defaults**
   ```typescript
   .addBooleanSwitch({
     path: 'showLabels',
     name: 'Show Labels',
     defaultValue: true,  // Most users probably want this ON
   })
   ```

5. **Group Related Options with Categories**
   ```typescript
   category: ['Appearance']  // Keeps GUI organized
   ```

### ❌ DON'T

1. **Don't Use Technical Jargon in Names**
   ```typescript
   name: 'Toggle Cesium.Viewer.enableLighting flag'  // ❌ Too technical
   // vs
   name: 'Realistic Sun Lighting'                    // ✅ User-friendly
   ```

2. **Don't Create Too Many Top-Level Options**
   - Use categories to organize
   - Consider if some options are really necessary

3. **Don't Forget TypeScript Types**
   ```typescript
   // BAD: Using 'any'
   export interface MyOptions {
     setting: any;  // ❌
   }
   
   // GOOD: Specific types
   export interface MyOptions {
     setting: 'small' | 'medium' | 'large';  // ✅
   }
   ```

4. **Don't Make Options Too Granular**
   ```typescript
   // Maybe TOO granular:
   .addNumberInput({ path: 'markerRedValue' })
   .addNumberInput({ path: 'markerGreenValue' })
   .addNumberInput({ path: 'markerBlueValue' })
   
   // Better:
   .addColorPicker({ path: 'markerColor' })
   ```

---

## Part 9: Testing Your Options

### Manual Testing Checklist

1. **Add panel to dashboard** - Does it appear?
2. **Open panel settings** - Do your options show up?
3. **Change a value** - Does the panel update immediately?
4. **Save dashboard** - Does the setting persist?
5. **Reload page** - Does the setting load correctly?
6. **Test `showIf` conditions** - Do dependent options appear/disappear?
7. **Test defaults** - Do new panels have correct initial values?

### Debug Tips

```typescript
// In your component, temporarily log options to see what's being received:
export const MyPanel: React.FC<Props> = ({ options }) => {
  console.log('Current options:', options);
  
  return <div>...</div>;
};
```

---

## Part 10: Complete Mini Example

Let's build a complete, simple example from scratch:

### Step 1: Define Options Interface
```typescript
// types.ts
export interface GreetingOptions {
  name: string;
  fontSize: number;
  showBorder: boolean;
  borderColor: string;
}
```

### Step 2: Create Panel Options
```typescript
// module.ts
import { PanelPlugin } from '@grafana/data';
import { GreetingOptions } from './types';
import { GreetingPanel } from './GreetingPanel';

export const plugin = new PanelPlugin<GreetingOptions>(GreetingPanel)
  .setPanelOptions((builder) => {
    return builder
      .addTextInput({
        path: 'name',
        name: 'Your Name',
        defaultValue: 'World',
      })
      .addNumberInput({
        path: 'fontSize',
        name: 'Font Size',
        defaultValue: 24,
        settings: {
          min: 10,
          max: 100,
        },
      })
      .addBooleanSwitch({
        path: 'showBorder',
        name: 'Show Border',
        defaultValue: false,
      })
      .addColorPicker({
        path: 'borderColor',
        name: 'Border Color',
        defaultValue: 'red',
        showIf: (config) => config.showBorder,
      });
  });
```

### Step 3: Use in Component
```typescript
// GreetingPanel.tsx
import React from 'react';
import { PanelProps } from '@grafana/data';
import { GreetingOptions } from './types';

interface Props extends PanelProps<GreetingOptions> {}

export const GreetingPanel: React.FC<Props> = ({ options, width, height }) => {
  return (
    <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1
        style={{
          fontSize: `${options.fontSize}px`,
          border: options.showBorder ? `3px solid ${options.borderColor}` : 'none',
          padding: options.showBorder ? '20px' : '0',
        }}
      >
        Hello, {options.name}!
      </h1>
    </div>
  );
};
```

### What the User Sees

**In Grafana GUI (right sidebar):**
```
┌─────────────────────────┐
│ Your Name              │
│ [World____________]    │
│                        │
│ Font Size              │
│ [24]                   │
│                        │
│ Show Border            │
│ [Toggle: OFF]          │
│                        │
│ (Border Color hidden)  │
└─────────────────────────┘
```

**When they toggle "Show Border" ON:**
```
┌─────────────────────────┐
│ Your Name              │
│ [World____________]    │
│                        │
│ Font Size              │
│ [24]                   │
│                        │
│ Show Border            │
│ [Toggle: ON]           │
│                        │
│ Border Color           │
│ [🔴 Red ▼]            │
└─────────────────────────┘
```

---

## Summary

### The Three Essential Files

1. **types.ts** - Define your options interface
2. **module.ts** - Define what controls appear in Grafana
3. **YourPanel.tsx** - Use the options to control behavior

### The Builder Pattern

Grafana uses a "builder" pattern: chain methods to add options:
```typescript
builder
  .addTextInput({ ... })
  .addBooleanSwitch({ ... })
  .addSelect({ ... })
```

### The Result

Users get a GUI to customize your panel without touching code, and you get type-safe access to their choices in your React component.

---

**Document Created**: November 27, 2024  
**Purpose**: Educational guide to Grafana panel settings system  
**Audience**: Developers new to Grafana plugin development

