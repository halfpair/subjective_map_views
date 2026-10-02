from scipy.optimize import fsolve
import numpy as np


class EEP(): # EqualEarthProjection
    a1 = 1.340264
    a2 = -0.081106
    a3 = 0.000893
    a4 = 0.003796

    @staticmethod
    def theta(lat):
        return np.arcsin(np.sqrt(3.0) / 2.0 * np.sin(-lat))

    @classmethod
    def x_factor(cls, lat):
        t = cls.theta(lat)
        return 2.0 * np.sqrt(3.0) * np.cos(t) / (3.0 * (cls.a1 + 3.0 * cls.a2 * t**2 + t**6 * (7.0 * cls.a3 + 9.0 * cls.a4 * t**2)))
        
    @classmethod
    def x(cls, long, lat):
        return long * cls.x_factor(lat)

    @classmethod
    def y(cls, lat):
        t = cls.theta(lat)
        return t * (cls.a1 + cls.a2 * t**2 + t**6 * (cls.a3 + cls.a4 * t**2));


def print_array(x):
    print(f"[{','.join(f'{v:e}' for v in x)}]")


if __name__ == "__main__":
    max_w = EEP.x(np.pi, 0.0)
    max_h = EEP.y(-np.pi / 2.0)
    side_ratio = max_w / max_h
    print(side_ratio)

    n = 101
    v = np.linspace(0.0, 1.0, n)
    
    lat = (v - 0.5) * np.pi
    y = EEP.y(lat)
    y = y / (2.0 * max_h) + 0.5
    print_array(y)

    y2 = (v - 0.5) * 2.0 * max_h
    lat2 = fsolve(lambda x: EEP.y(x) - y2, -lat)
    print_array(lat2)
    
    xf = EEP.x_factor(lat)
    xf = xf / (max_w)
    print_array(xf)
