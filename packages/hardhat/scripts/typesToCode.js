const types = require('./types');
const fs = require('fs');
const path = require('path');
const {
  signTypedData,
  TypedDataUtils,
  typedSignatureHash,
  SignTypedDataVersion,
  encodeData,
  encodeType,
} = require('signtypeddata-v5').TypedDataUtils;

const LOGGING_ENABLED = false;

function generateCodeFrom (types) {
  let results = [];

  const packetHashGetters = [];
  Object.keys(types.types).forEach((typeName) => {
    const fields = types.types[typeName];
    const typeHash = `bytes32 constant ${typeName.toUpperCase()}_TYPEHASH = keccak256("${encodeType(typeName, types.types)}");\n`;
    const struct = `struct ${typeName} {\n${fields.map((field) => { return `  ${field.type} ${field.name};\n`}).join('')}}\n`
    generatePacketHashGetters(types, typeName, fields, packetHashGetters);
    results.push({ struct, typeHash });
  });

  console.log(`have generated ${packetHashGetters.length} packet hash getters`);
  const uniqueGetters = [...new Set(packetHashGetters)];
  console.log(`or uniquely, just ${uniqueGetters.length}`, uniqueGetters);

  return { setup: results, packetHashGetters: [...new Set(packetHashGetters)] };
}

function generatePacketHashGetters (types, typeName, fields, packetHashGetters = []) {
  if (typeName.includes('[]')) {
    generateArrayPacketHashGetter(typeName, packetHashGetters);
  } else {
    packetHashGetters.push(`
  function ${packetHashGetterName(typeName)} (${typeName} memory _input) public pure returns (bytes32) {
    ${ LOGGING_ENABLED ? `console.log("${typeName} typehash: ");
    console.logBytes32(${typeName.toUpperCase()}_TYPEHASH);` : ''}
    bytes memory encoded = abi.encode(
      ${ typeName.toUpperCase() }_TYPEHASH,
      ${ fields.map(getEncodedValueFor).join(',\n      ') }
    );
    ${LOGGING_ENABLED ? `console.log("Encoded ${typeName}: ");
    console.logBytes(encoded);` : ''}
    return keccak256(encoded);
  }`);
  }

  fields.forEach((field) => {
    if (field.type.includes('[]')) {
      generateArrayPacketHashGetter(field.type, packetHashGetters);
    }
  });

  return packetHashGetters;
}

function getEncodedValueFor (field) {
  const basicEncodableTypes = ['address', 'bool', 'bytes32', 'int', 'uint', 'uint256', 'string'];
  const hashedTypes = ['bytes'];
  if (basicEncodableTypes.includes(field.type)) {
    return `_input.${field.name}`;
  }

  if (hashedTypes.includes(field.type)) {
    return `keccak256(_input.${field.name})`;
  }

  return `${packetHashGetterName(field.type)}(_input.${field.name})`;
}

function packetHashGetterName (typeName) {
  if (typeName.includes('[]')) {
    return `GET_${typeName.substr(0, typeName.length - 2).toUpperCase()}_ARRAY_PACKETHASH`;
  }
  return `GET_${typeName.toUpperCase()}_PACKETHASH`;
}

function generateArrayPacketHashGetter (typeName, packetHashGetters) {
  console.log(`Generating array packet hash getter for ${typeName}`);
  packetHashGetters.push(`
  function ${packetHashGetterName(typeName)} (${typeName} memory _input) public pure returns (bytes32) {
    bytes memory encoded;
    for (uint i = 0; i < _input.length; i++) {
      encoded = bytes.concat(
        encoded,
        ${packetHashGetterName(typeName.substr(0, typeName.length - 2))}(_input[i])
      );
    }
    ${LOGGING_ENABLED ? `console.log("Encoded ${typeName}: ");
    console.logBytes(encoded);` : ''}
    bytes32 hash = keccak256(encoded);
    return hash;
  }`);
}

function updateSolidity () {
  const { setup, packetHashGetters } = generateCodeFrom(types);
  const filePath = path.join(__dirname, '../contracts/TypesAndDecoders.sol');
  const file = fs.readFileSync(filePath, 'utf8').toString();
  const oldFile = file.split('\n');
  const newFile = [];

  let typeDefRange = false;
  let contractBodyRange = false;
  oldFile.forEach((line) => {
    if (line.includes('// BEGIN EIP712 AUTOGENERATED SETUP')) {
      typeDefRange = true;
      newFile.push(line);
      setup.forEach((type) => {
        newFile.push(type.struct);
        newFile.push(type.typeHash);
      });
      return true;
    }

    if (line.includes('// END EIP712 AUTOGENERATED SETUP')) {
      typeDefRange = false;
      newFile.push(line);
      return true;
    }

    if (line.includes('// BEGIN EIP712 AUTOGENERATED BODY')) {
      contractBodyRange = true;
      newFile.push(line);
      packetHashGetters.forEach((getterLine) => {
        newFile.push(getterLine);
      });
      return true;
    }

    if (line.includes('// END EIP712 AUTOGENERATED BODY')) {
      contractBodyRange = false;
      newFile.push(line);
      return true;
    }

    // Return any line not in the typeDefRange
    if (!typeDefRange && !contractBodyRange) {
      newFile.push(line);
    }
  })

  const newFileString = newFile.join('\n');
  // console.log(newFileString)
  fs.writeFileSync(filePath, newFileString);
}

module.exports = {
  generateCodeFrom,
  updateSolidity,
}
