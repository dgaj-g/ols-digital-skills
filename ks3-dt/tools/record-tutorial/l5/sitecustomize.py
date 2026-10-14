# The lighthouse's three wired functions, as builtins, for the red-text gate. Effects go to $L5_FX.
import builtins, json, os
_fx = []
def _rec(kind, v):
    _fx.append([kind, str(v), type(v).__name__])
    with open(os.environ['L5_FX'], 'w') as f:
        json.dump(_fx, f)
def light(beam): _rec('light', beam)
def horn(blasts): _rec('horn', blasts)
def radio(message): _rec('radio', message)
if os.environ.get('L5_FX'):
    builtins.light, builtins.horn, builtins.radio = light, horn, radio
