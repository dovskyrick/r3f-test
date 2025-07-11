RotateVector 	Applies a rotation matrix to a vector, yielding a vector in another orientation system.
InverseRotation 	Given a rotation matrix, finds the inverse rotation matrix that does the opposite transformation.
CombineRotation 	Given two rotation matrices, returns a rotation matrix that combines them into a net transformation.
IdentityMatrix 	Returns a 3x3 identity matrix, which can be used to form other rotation matrices.
Pivot 	Transforms a rotation matrix by pivoting it around a given axis by a given angle.
VectorFromSphere 	Converts spherical coordinates to Cartesian coordinates.
SphereFromVector 	Converts Cartesian coordinates to spherical coordinates.
EquatorFromVector 	Given an equatorial vector, calculates equatorial angular coordinates.
VectorFromHorizon 	Given apparent angular horizontal coordinates, calculates horizontal vector.
HorizonFromVector 	Given a vector in horizontal orientation, calculates horizontal angular coordinates.
Rotation_EQD_EQJ 	Calculates a rotation matrix from true equator of date (EQD) to J2000 mean equator (EQJ).
Rotation_EQD_ECT 	Calculates a rotation matrix from true equator of date (EQD) to true ecliptic of date (ECT).
Rotation_EQD_ECL 	Calculates a rotation matrix from true equator of date (EQD) to J2000 mean ecliptic (ECL).
Rotation_EQD_HOR 	Calculates a rotation matrix from true equator of date (EQD) to horizontal (HOR).
Rotation_EQJ_EQD 	Calculates a rotation matrix from J2000 mean equator (EQJ) to true equator of date (EQD).
Rotation_EQJ_ECT 	Calculates a rotation matrix from J2000 mean equator (EQJ) to true ecliptic of date (ECT).
Rotation_EQJ_ECL 	Calculates a rotation matrix from J2000 mean equator (EQJ) to J2000 mean ecliptic (ECL).
Rotation_EQJ_HOR 	Calculates a rotation matrix from J2000 mean equator (EQJ) to horizontal (HOR).
Rotation_ECT_EQD 	Calculates a rotation matrix from true ecliptic of date (ECT) to true equator of date (EQD).
Rotation_ECT_EQJ 	Calculates a rotation matrix from true ecliptic of date (ECT) J2000 mean equator (EQJ).
Rotation_ECL_EQD 	Calculates a rotation matrix from J2000 mean ecliptic (ECL) to true equator of date (EQD).
Rotation_ECL_EQJ 	Calculates a rotation matrix from J2000 mean ecliptic (ECL) to J2000 mean equator (EQJ).
Rotation_ECL_HOR 	Calculates a rotation matrix from J2000 mean ecliptic (ECL) to horizontal (HOR).
Rotation_HOR_EQD 	Calculates a rotation matrix from horizontal (HOR) to true equator of date (EQD).
Rotation_HOR_EQJ 	Calculates a rotation matrix from horizontal (HOR) to J2000 mean equator (EQJ).
Rotation_HOR_ECL 	Calculates a rotation matrix from horizontal (HOR) to J2000 mean ecliptic (ECL).
Rotation_EQJ_GAL 	Calculates a rotation matrix from J2000 mean equator (EQJ) to galactic (GAL).
Rotation_GAL_EQJ 	Calculates a rotation matrix from galactic (GAL) to J2000 mean equator (EQJ).


taking into consideration the possible functions of astronomy js that i wrote in the markdown, write further in the markdown the explanation for each one and realise which is correct for transforming the coordinates which are initially aligned with the orbital plane of the orbit of the earth around the sun and have one vector pointing at the sun to the coordinates which have the rotation axis of the earth as one vector and 12:00 latitude intersect with the equator as another vector. again from the icrf relative to the earth to the itrf or backwards (if its backwards its a good solution since the fix for that is a minus sign ). i suspect the EQJ EQD wasnt correct but i am not sure, if you write as extensively as possible the justification and the explanation of each transformation we can hone in on whether they are appropriate or not, for each transformation write the explanation pretty long one like explain each astronomy term that i most likely dont understand and write why it fits the purpose or doesnt fit the purpose of applying the desired transformation 

## DETAILED ANALYSIS OF COORDINATE TRANSFORMATIONS

### Understanding the Problem
We need to transform from:
- **Source**: ICRF (International Celestial Reference Frame) - coordinates aligned with Earth's orbital plane around the sun, with one vector pointing at the sun
- **Target**: ITRF (International Terrestrial Reference Frame) - coordinates with Earth's rotation axis as one vector and 12:00 longitude intersecting the equator as another vector

This is essentially transforming from a **celestial/inertial frame** to an **Earth-fixed/terrestrial frame**.

### Key Astronomical Reference Frames Explained

**EQJ (J2000 Mean Equator)**: This is the International Celestial Reference Frame (ICRF) based on the Earth's equatorial plane and the vernal equinox as they were on January 1, 2000, at 12:00 TT (Terrestrial Time). This is a **fixed inertial frame** that doesn't change with time. The X-axis points toward the vernal equinox of J2000, the Z-axis points toward the north celestial pole of J2000, and the Y-axis completes the right-handed coordinate system. This frame is **NOT aligned with Earth's orbital plane** - it's aligned with Earth's equatorial plane projected onto the celestial sphere at the J2000 epoch.

**ECL (J2000 Mean Ecliptic)**: This frame is aligned with the **Earth's orbital plane around the sun** at the J2000 epoch. The X-axis points toward the vernal equinox, the Z-axis is perpendicular to the ecliptic plane (Earth's orbital plane), and the Y-axis completes the system. This frame is **exactly what you described** as your source frame - it's aligned with Earth's orbital plane with coordinates that can have a vector pointing at the sun.

**EQD (True Equator of Date)**: This is the Earth's equatorial coordinate system for a specific date, accounting for **precession** (the slow wobble of Earth's axis over ~26,000 years) and **nutation** (small oscillations in Earth's axis). This frame rotates slowly with respect to the fixed J2000 frame due to these effects. The Z-axis points toward the true north celestial pole for the given date.

**ECT (True Ecliptic of Date)**: This is the ecliptic coordinate system for a specific date, accounting for the slow changes in the ecliptic plane due to planetary perturbations.

**HOR (Horizontal)**: This is a **local topocentric frame** tied to a specific location on Earth's surface. It's not what we want for ITRF.

**GAL (Galactic)**: This frame is aligned with the Milky Way galaxy's structure and is irrelevant for our Earth-based transformation.

### Analysis of Each Transformation

#### **Rotation_ECL_EQJ** - MOST LIKELY CORRECT FOR YOUR NEEDS
**Explanation**: This transforms from J2000 Mean Ecliptic (ECL) to J2000 Mean Equator (EQJ). 
- **ECL** is exactly your source frame - aligned with Earth's orbital plane around the sun
- **EQJ** is the ICRF/celestial frame aligned with Earth's equatorial plane
- **Why it fits**: Your source coordinates are "aligned with the orbital plane of the orbit of the earth around the sun" which is precisely the ecliptic plane (ECL). However, this only gets you halfway to ITRF - you still need to account for Earth's rotation.
- **Limitation**: This is a fixed transformation that doesn't account for time-dependent effects or Earth's rotation.

#### **Rotation_EQJ_ECL** - INVERSE OF ABOVE
**Explanation**: This is the inverse transformation from J2000 Mean Equator to J2000 Mean Ecliptic.
- **Why it might fit**: If your current implementation is backwards, this could be the solution with a minus sign as you mentioned.
- **Same limitation**: Still doesn't account for Earth's rotation or time-dependent effects.

#### **Rotation_EQJ_EQD** - PARTIALLY CORRECT BUT INSUFFICIENT
**Explanation**: This transforms from J2000 Mean Equator (EQJ) to True Equator of Date (EQD).
- **What it does**: Accounts for precession and nutation - the slow changes in Earth's orientation over time
- **Why it's insufficient**: This doesn't transform from your source frame (orbital plane) and doesn't account for Earth's daily rotation
- **Your suspicion**: You're right to suspect this isn't correct - it's missing the ecliptic-to-equatorial transformation and the daily rotation component

#### **Rotation_EQD_EQJ** - INVERSE OF ABOVE
**Explanation**: Transforms from True Equator of Date back to J2000 Mean Equator.
- **Why it's wrong**: Goes in the opposite direction and still doesn't address the core issues

#### **Rotation_ECL_EQD** - CLOSER BUT STILL INCOMPLETE
**Explanation**: This transforms from J2000 Mean Ecliptic (ECL) to True Equator of Date (EQD).
- **Why it's better**: Starts from your source frame (orbital plane) and goes to the Earth's equatorial frame for the current date
- **What it includes**: The fundamental ecliptic-to-equatorial transformation plus precession and nutation
- **What it's missing**: Earth's daily rotation component to get to the true Earth-fixed frame (ITRF)

#### **Rotation_EQD_ECL** - INVERSE OF ABOVE
**Explanation**: Transforms from True Equator of Date to J2000 Mean Ecliptic.
- **Potential use**: Could be the correct transformation if your current implementation is backwards

### THE COMPLETE SOLUTION

For a proper ICRF-to-ITRF transformation, you need **THREE components**:

1. **Ecliptic to Equatorial**: `Rotation_ECL_EQD` or `Rotation_ECL_EQJ` followed by `Rotation_EQJ_EQD`
2. **Precession/Nutation**: Already included in the EQD transformations
3. **Earth Rotation**: A separate rotation about the Z-axis by the Greenwich Mean Sidereal Time (GMST)

### RECOMMENDED APPROACH

```
Complete Transformation = Earth_Rotation × Rotation_ECL_EQD
```

Where:
- `Rotation_ECL_EQD` handles the ecliptic-to-equatorial transformation plus precession/nutation
- `Earth_Rotation` is a Z-axis rotation by GMST to account for Earth's daily rotation

**Alternative if backwards**:
```
Complete Transformation = Rotation_EQD_ECL × Earth_Rotation^(-1)
```

### WHY EQJ_EQD WAS INSUFFICIENT

Your suspicion about `Rotation_EQJ_EQD` was correct because:
1. It assumes you're starting from the J2000 equatorial frame, but you're actually starting from the ecliptic frame (orbital plane)
2. It only handles precession/nutation, not the fundamental ecliptic-to-equatorial transformation
3. It doesn't include Earth's daily rotation

The key insight is that your source frame is the **ecliptic plane** (Earth's orbital plane), not the **equatorial plane**, so you need an ecliptic-based transformation as the starting point. 