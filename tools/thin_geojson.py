import json

def isListOfFloatPairs (l):
    if isinstance (l, list):
        for v in l:
            if not (isinstance (v, list) and len (v) == 2 and isinstance (v[0], float) and isinstance (v[1], float)):
                return False
        return True
    return False


def walkDictOrList (d_or_l, checker, container):
    if isinstance (d_or_l, dict):
        for _, v in sorted (d_or_l.items ()):
            walkDictOrList (v, checker, container)
    elif isinstance (d_or_l, list):
        for v in d_or_l:
            walkDictOrList (v, checker, container)
    if checker (d_or_l):
        container.append (d_or_l)

def thinDoubledPoints (polygons):
    res_polys = []
    for i, poly in enumerate (polygons):
        print (i)
        temp_poly = []
        for point in poly:
            use_point = True
            for res_poly in res_polys:
                for res_point in res_poly:
                    if (point[0] - res_point[0])**2 + (point[1] - res_point[1])**2 < 1.e-6:
                        use_point = False
                        break
                if not use_point:
                    break
            if use_point:
                temp_poly.append (point)
        if (len (temp_poly)):
            res_polys.append (temp_poly)
    return res_polys

if __name__ == "__main__":
    with open ("./ne_110m_countries.json") as fid:
        data = json.load (fid)
    results = []
    walkDictOrList (data, isListOfFloatPairs, results)
    print (len (results))
    print (sum (len (v) for v in results))
    #results = thinDoubledPoints (results)
    #print (len (results))
    #print (sum (len (v) for v in results))
    with open ("./ne_110m_countries_red.json", "w") as fid:
        json.dump (results, fid)