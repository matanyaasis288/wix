/************************************** TYPES **********************************************/

export interface Data{
    "id" : string;
    "title" : string;
    "content" : string;
    "views" : number;
    "timestamp" : number
}

export interface Query{
    tag : "Query";
    type? : string;
    property : string;
    value : string
}

export const makeQuery = 
    (property : string, value : string, type? :string): Query => ({tag: "Query", type: type, property: property, value: value});


/*************************************************************************************************
* @class DataQuery 
*
*  Class representing data query
*  the class contains 3 parts:
*    
*    1. The class fields  
*    2. API functions for outside use
*    3. String Parsers
*    4. Helper functions    
* 
**************************************************************************************************/
export class DataQuery {

    /****************************************** FIELDS **************************************************/

    private data : Data[] = []
    
    private operators : string[] = 
        ["EQUAL",
         "GREATER_THAN",
         "LESS_THAN",
         "NOT",
         "OR",
         "AND"]

    private parsers : {} =
        {"EQUAL" : this.parseEqual,
         "GREATER_THAN" : this.parseLessGreaterThan,
         "LESS_THAN" : this.parseLessGreaterThan,
         "NOT" : this.parseNot,
         "OR" : this.parseOrAnd,
         "AND" : this.parseOrAnd}                       
    
    private queryFunctions : {} = 
        {"EQUAL" : this.EQUAL,
         "GREATER_THAN" : this.GREATER_THAN,
         "LESS_THAN" : this.LESS_THAN,
         "NOT" : this.NOT,
         "OR" : this.OR,
         "AND" : this.AND}

    private stringProperties : string[] =
        ["id",
         "title", 
        "content"]    
        
    private numberProperties : string[] = 
        ["views",
        "timestamp"]    

    private properties : string[] = this.stringProperties.concat(this.numberProperties)

    /****************************************** API **************************************************/

    /*************************************************************************************************
    * Summary.
    * 
    * @param {string} rawQuery raw query string sent from the client
    * 
    * @return {string} Return json string with the answer to the query. 
    **************************************************************************************************/
    GET(rawQuery : string) : string {
        let queryType : string = this.getQueryType(rawQuery)
        let query : string = rawQuery.substring(queryType.length)

        console.log("DataQuery: GET [" + rawQuery + "]")

        let parsed : Query[] = this.parse(queryType, query)

        let reqData : Data[] = this.queryFunctions[queryType](parsed, this.data, this) 
                        
        return JSON.stringify(reqData,null, 2)
    }   

    /*************************************************************************************************
    * Summary.
    * 
    * @param {string} data  String representation of the Data object to add to the Data Query
    * 
    * @return {boolean} Return if the POST action succeded
    **************************************************************************************************/
    POST(data : string) : boolean{
        /* filter out entity with the same id, if exist */
        let entity : Data = JSON.parse(data)

        this.data = this.data.filter((e : Data) => e.id !== entity.id)
        this.data.push(entity)

        console.log("DataQuery: POST updated data [" + JSON.stringify(this.data) + "]")

        return true
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {Query[]} query Description.
    * @param {Data[]} data Description.
    * @param {Data[]} dataQuery Description.
    * 
    * @return {Data[]} Return Data set that satasfied  
    **************************************************************************************************/
    EQUAL(query : Query[], data : Data[], dataQuery : DataQuery) : Data[]{
        return data.filter((e : Data) => 
            dataQuery.numberProperties.some((p) => p === query[0].property) ? e[query[0].property] === parseInt(query[0].value) :
                                                                              e[query[0].property] === query[0].value)
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    GREATER_THAN(query : Query[], data : Data[], dataQuery : DataQuery) : Data[]{
        if(!dataQuery.isNumberProperty(query[0].property) || isNaN(parseInt(query[0].value)))
            throw new Error("ERROR while parsing query")
        
        return data.filter((e : Data) => e[query[0].property] > parseInt(query[0].value))
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    LESS_THAN(query : Query[], data : Data[], dataQuery : DataQuery) : Data[]{
        if(!dataQuery.isNumberProperty(query[0].property) || isNaN(parseInt(query[0].value)))
            throw new Error("ERROR while parsing query")

        return data.filter((e : Data) => e[query[0].property] < parseInt(query[0].value))
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    AND(queries : Query[], data : Data[], dataQuery : DataQuery) : Data[]{
        return queries.reduce((acc, curr) => 
            dataQuery.queryFunctions[curr.type]([makeQuery(curr.property, curr.value, curr.type)], acc, dataQuery), dataQuery.data)
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    OR(queries : Query[], data : Data[], dataQuery : DataQuery) : Data[]{
        return queries.reduce((acc, curr) => 
               dataQuery.queryFunctions[curr.type]([makeQuery(curr.property,curr.value, curr.type)], dataQuery.data, dataQuery)
                        .filter((data2 : Data) => !acc.some((data1) => data1 === data2))
                        .concat(acc),
               [])
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    NOT(query : Query[], data : Data[], dataQuery : DataQuery) : Data[]{
        let queried : Data[] = dataQuery.queryFunctions[query[0].type]([makeQuery(query[0].property, query[0].value, query[0].type)], dataQuery.data, dataQuery)
        
        return dataQuery.data.filter((data2 : Data) => !queried.some((data1) => data1 === data2))
    }
    


    /************************************** Parser **********************************************/

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private parse(queryType : string, query : string) : Query[]{
        console.log("DataQuery: Parsing " + queryType)

        return this.parsers[queryType](queryType, query, this)
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private parseEqual(queryType : string, query : string, dataQuery : DataQuery) : Query[] {
        let regExp : RegExp = /\(([^)]+)\)/
        let parentExps : string[] = regExp.exec(query).map((exp) => exp.substring(1, exp.length - 1))
        let pair = parentExps[0].split(',')
        let property : string = pair[0]
        let value : string = dataQuery.isNumberProperty(property) ? pair[1] : pair[1].substr(1,pair[1].length - 2)

        console.log("DataQuery: EQUAL Property[" + property + "] Value[" + value + "]")

        return [makeQuery(property, value, "EQUAL")]
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private parseLessGreaterThan(queryType : string, query : string, dataQuery : DataQuery) : Query[]{
        let regExp : RegExp = /\(([^)]+)\)/
        let parentExps : string[] = regExp.exec(query).map((exp) => exp.substring(1, exp.length - 1))
        let pair = parentExps[0].split(',')
        let property : string = pair[0]
        let value : string = dataQuery.isNumberProperty(property) ? pair[1] : pair[1].substr(1,pair[1].length - 2)

        console.log("DataQuery: " + queryType + " Property[" + property + "] Value[" + parseInt(value) + "]")

        return [makeQuery(property, value, queryType)]
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private parseNot(queryType : string, query : string, dataQuery : DataQuery) : Query[] {
        let inQueryType : string = dataQuery.getQueryType(query.substring(1, query.length - 1))
        let inQuery : string = query.substring(inQueryType.length)
        let proccesedInQuery : Query[] = dataQuery.parse(inQueryType, inQuery)

        return [makeQuery(proccesedInQuery[0].property, proccesedInQuery[0].value, proccesedInQuery[0].type)]
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private parseOrAnd(queryType : string, query : string, dataQuery : DataQuery) : Query[]{
        let subQueries : Query[] = []
    
        /* parse (op(ex1,ex2),op(ex1,ex2)+) */
        query = query.substring(1)
        while(query.length > 0)
        {
            let operator = dataQuery.parseOperator(query, dataQuery).parsed
            let rawPair = dataQuery.parseOperator(query, dataQuery).rest
            let propertyValuePair = dataQuery.parsePair(rawPair, dataQuery).parsed
            subQueries.push(makeQuery(propertyValuePair[0], propertyValuePair[1], operator))   
            query = dataQuery.parsePair(rawPair, dataQuery).rest.substring(1)
        }

        return subQueries
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private parseOperator = (query : string, dataQuery : DataQuery) : {parsed : string, rest : string} => {
        let parse = dataQuery.operators.map((op) => query.substring(0, op.length) === op ? op : undefined)
                             .reduce((acc, curr) => curr !== undefined ? curr : acc, undefined) 

        if(parse === undefined)
            throw new Error("ERROR while parsing query")                          

        return {parsed : parse, rest : query.substring(parse.length)}                 
    }

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private parsePair = (query : string, dataQuery : DataQuery) : {parsed : string[], rest : string} => {
        let PARENS_LENGTH = 2
        
        if(query.indexOf('(') !== 0 || query.indexOf(')') === -1)
            throw new Error("ERROR while parsing query")

        let pair : string = query.substring(query.indexOf('(') + 1, query.indexOf(')'))

        if(pair.split(",").length !== 2)
            throw new Error("ERROR while parsing query")

        return  {parsed : pair.split(","), rest : query.substring(pair.length + PARENS_LENGTH)}
    }


    /************************************** HELPERS **********************************************/

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private isQuery : (queryType :string, rawQuery : string) => boolean =
        (queryType : string, rawQuery : string) => rawQuery.indexOf(queryType) == 0

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private getQueryType : (rawQuery : string) => string = 
        (rawQuery : string) => this.isQuery("EQUAL", rawQuery) ? "EQUAL" :
                               this.isQuery("AND", rawQuery) ? "AND" :
                               this.isQuery("OR", rawQuery) ? "OR" :
                               this.isQuery("NOT", rawQuery) ? "NOT" :
                               this.isQuery("GREATER_THAN", rawQuery) ? "GREATER_THAN" :
                               this.isQuery("LESS_THAN", rawQuery) ? "LESS_THAN" : "ERROR"

    /*************************************************************************************************
    * Summary.
    * 
    * @param {very_long_type} name           Description.
    * @param {type}           very_long_name Description.
    * 
    * @return {type} Return value description. 
    **************************************************************************************************/
    private isNumberProperty = (property : string | number) => this.numberProperties.some((p) => p === property)

}


