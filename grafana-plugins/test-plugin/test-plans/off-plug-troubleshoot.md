🔍 Hypotheses for Why the Satellite Disappears During Animation

A structured debugging checklist (Grafana → plugin → Cesium).

## 🟦 Grafana / Data Layer Hypotheses
1. Time field not parsed as a proper time

The dataset uses "2023-12-29 07:02:34" instead of ms epoch (1733097600000).

Grafana fails to recognize the field type as "time".

The animation engine cannot find time-correlated samples.

Result: trajectory shows (static polyline), animated marker disappears.

2. Time values are outside the current dashboard time range

Grafana only provides data inside the selected time window.

If your times are “in the past” relative to Grafana’s time picker, the animation range contains no samples.

The line still displays because Grafana may render all rows, but animation uses only time-filtered rows.

3. Dataset shape not interpreted as fields/series correctly

Possibilities:

The datasource interprets the JSON but produces fields with wrong type or name.

Time becomes a string, not a time field.

Quaternion or coordinate fields become strings instead of numbers.

4. Field name mismatches

Grafana → plugin mapping might require exact names like:

Longitude / Latitude / Altitude

qx / qy / qz / qs

If dataset uses:

longitude

q_B_ECI_x

etc.

…the plugin’s animation logic may skip them.

5. Data not sorted by time

If the datasource doesn’t guarantee sorted timestamps,

interpolation/animation code may assume strict ascending order,

causing frame lookup to fail.

🟩 Plugin Logic Hypotheses (Satellite Visualizer)
6. Plugin expects specific field names

Static trajectory might use generic numeric fields,
while animation logic relies on a hard-coded schema:

series.fields.find(f => f.name === "Longitude")

etc.

If any are missing → animation stops drawing the satellite.

7. Plugin relies on Grafana DataFrame metadata

The plugin might require:

field.type === FieldType.time

field.type === FieldType.number

OR vectors of equal lengths

If any field fails the internal sanity checks → satellite hides.

8. Quaternion normalization failure

If plug-in normalizes quaternions:

Non-realistic input

Norm very small

Missing last component

Wrong handed coordinate system (ECI vs ECEF mismatch)

Values not matching a unit quaternion

→ normalization yields NaN, and Cesium silently refuses to render the orientation.

9. Plugin has a safeguard: “if no valid sample at current time → hide marker”

Trajectory:

Draws full polyline once from all rows.

Satellite animation:

Uses only the "current timestamp",

If no sample matches → marker disappears.

This explains why static appears but animation does not.

🟥 Cesium Layer Hypotheses
10. Cesium cannot create a valid orientation

Quaternion (qx, qy, qz, qs) may not be in the correct order.

Cesium expects [x, y, z, w], but plugin may be passing [w, x, y, z].

Some quaternions in your dataset might not normalize into a valid rotation.

Cesium’s behavior in this case:

Entity may exist but orientation is Undefined,

Marker disappears.

11. Altitude/ECI conversion issues

If plugin converts lat/long/alt → Cartesian improperly,

Or uses ECI quaternions with Earth-fixed positions,

Animation could produce positions “off-Earth” or “NaN-ish”.

Static line might render from direct values,
but per-frame animated point might be using a different code path.

12. Interpolation producing NaN

Cesium interpolation can fail when:

Times not increasing monotonically

Orientation interpolation produces invalid quaternion

Cesium’s error handling:
silently drop the entity without crashing.

🧪 Where to debug first (priority order)

Console log Grafana datasource output

console.log(data.series) in plugin.

Check field types

fields[].type values: must be time and number.

Check field names

Must match plugin internal logic.

Check timestamp format

Must be ms epoch if plugin uses numeric comparison.

Validate quaternion normalization

Compute sqrt(x² + y² + z² + w²) — must be ~1.0.

Inspect Cesium entity fields

position and orientation objects.