import json

def hasNameAndCoordinates (d):
    if isinstance (d, dict):
        try:
            d['properties']['name']
            d['geometry']['coordinates']
        except KeyError:
            return False
        return True
    return False


def reduceCity (d):
    return (d['properties']['name'],
            d['geometry']['coordinates'])


def walkDictOrList (d_or_l, checker, container):
    if isinstance (d_or_l, dict):
        for _, v in sorted (d_or_l.items ()):
            if checker (v):
                rcity = reduceCity (v)
                container[rcity[0]] = rcity[1]
            else:
                walkDictOrList (v, checker, container)
    elif isinstance (d_or_l, list):
        for v in d_or_l:
            if checker (v):
                rcity = reduceCity (v)
                container[rcity[0]] = rcity[1]
            else:
                walkDictOrList (v, checker, container)


if __name__ == "__main__":
    with open ("./../data/ne_110m_populated_places_simple/cities.geojson") as fid:
        data = json.load (fid)
    results = {}
    walkDictOrList (data, hasNameAndCoordinates, results)
    print (len (results))
    with open ("./cities_red.json", "w") as fid:
        json.dump (results, fid)
