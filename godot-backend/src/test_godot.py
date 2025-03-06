import godot.core.tempo as tempo
epoch = tempo.parseEpoch("2012-10-30T08:23:11.0 UTC")
print(epoch)
epoch = tempo.convert(tempo.TimeScale.TCB, epoch)
print(epoch)

