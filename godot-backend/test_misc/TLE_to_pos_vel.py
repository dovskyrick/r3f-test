from astropy import units as u
from astropy.coordinates import TEME, ITRS, CartesianDifferential, CartesianRepresentation
from astropy.time import Time
from sgp4.api import Satrec


def TLE_to_pos_vel(TLE1, TLE2, jd, jf):
    # Create a satellite object

    satellite = Satrec.twoline2rv(TLE1, TLE2)

    e, r, v = satellite.sgp4(jd, jf)

    # Create a CartesianDifferential object with the velocity
    velocity_diff = CartesianDifferential(*v, unit=u.km/u.s)

    # Create a CartesianRepresentation object with the position and velocity
    cart_rep = CartesianRepresentation(*r, unit=u.km, differentials=velocity_diff)

    # Create a TEME coordinate object with the CartesianRepresentation
    teme_p = TEME(cart_rep, obstime=Time(jd+jf, format='jd'))

    # Convert the TEME coordinates to ITRS
    itrf_p = teme_p.transform_to(ITRS(obstime=Time(jd+jf, format='jd')))

    return itrf_p.cartesian.xyz.to(u.km), itrf_p.velocity.d_xyz.to(u.km/u.s)