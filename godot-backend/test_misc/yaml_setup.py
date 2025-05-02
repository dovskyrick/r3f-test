# Compute the position and velocity of the satellite at the initial epoch
daysAndFraction = e0.jdPair(tempo.TimeScale.TT, tempo.JulianDay.JD)
pos_vel = TLE_to_pos_vel(line["TLE_LINE1"], line["TLE_LINE2"], daysAndFraction.day, daysAndFraction.fraction)

yamldata['timeline'][0]['epoch'] = e0.calStr("UTC", 6)
yamldata['timeline'][0]['state'][0]['value']['pos_x'] = str(pos_vel[0][0])
yamldata['timeline'][0]['state'][0]['value']['pos_y'] = str(pos_vel[0][1])
yamldata['timeline'][0]['state'][0]['value']['pos_z'] = str(pos_vel[0][2])
yamldata['timeline'][0]['state'][0]['value']['vel_x'] = str(str(pos_vel[1][0].value) + " km/s")
yamldata['timeline'][0]['state'][0]['value']['vel_y'] = str(str(pos_vel[1][1].value) + " km/s")
yamldata['timeline'][0]['state'][0]['value']['vel_z'] = str(str(pos_vel[1][2].value) + " km/s")
yamldata['timeline'][1]['point']['epoch'] = (ef+1).calStr("UTC", 6)

# Save the trajectory configuration
with open(r"./Config_Yaml_Files/Trajectory/trajectory_csim.yml", "w") as out:
    yaml.dump(yamldata, out)

# Load the universe configuration and create the universe object
uniConfig = cosmos.util.load_yaml('Config_Yaml_Files/Universe/universe_bugsat.yml')
uni = cosmos.Universe(uniConfig)

# Load the trajectory configuration and create the trajectory object using the universe object
traConfig = cosmos.util.load_yaml('Config_Yaml_Files/Trajectory/trajectory_csim.yml')
tra = cosmos.Trajectory(uni, traConfig)