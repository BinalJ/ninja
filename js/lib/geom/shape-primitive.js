/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

// Helper function for generating a RDGE primitive
var ShapePrimitive = {};

ShapePrimitive.create = function(coords,  normals,  uvs,  indices, primType, vertexCount) {
	var renderer = RDGE.globals.engine.getContext().renderer;

	// to setup a primitive you must define it
	// create a new primitive definition here to then fill out
	var prim = new RDGE.rdgePrimitiveDefinition();

	// the vertex definition declares how the data will be delivered to the shader
	// the position of an element in array determines which attribute in a shader the
	// data is bound to
	prim.vertexDefinition = {
		// this shows two ways to map this data to an attribute
		"vert":{'type':renderer.VS_ELEMENT_POS, 'bufferIndex':0, 'bufferUsage': renderer.BUFFER_STATIC},
		"a_pos":{'type':renderer.VS_ELEMENT_POS, 'bufferIndex':0, 'bufferUsage': renderer.BUFFER_STATIC},

		"normal":{'type':renderer.VS_ELEMENT_FLOAT3, 'bufferIndex':1, 'bufferUsage': renderer.BUFFER_STATIC},
		"a_nrm":{'type':renderer.VS_ELEMENT_FLOAT3, 'bufferIndex':1, 'bufferUsage': renderer.BUFFER_STATIC},
		"a_normal":{'type':renderer.VS_ELEMENT_FLOAT3, 'bufferIndex':1, 'bufferUsage': renderer.BUFFER_STATIC},

		"texcoord":{'type':renderer.VS_ELEMENT_FLOAT2, 'bufferIndex':2, 'bufferUsage': renderer.BUFFER_STATIC},
		"a_texcoord":{'type':renderer.VS_ELEMENT_FLOAT2, 'bufferIndex':2, 'bufferUsage': renderer.BUFFER_STATIC}
	};

	// the actual data that correlates to the vertex definition
	prim.bufferStreams = [ coords, normals, uvs ];

	// what type of buffers the data resides in, static is the most common case
	prim.streamUsage = [ renderer.BUFFER_STATIC, renderer.BUFFER_STATIC, renderer.BUFFER_STATIC ];

	// this tells the renderer to draw the primitive as a list of triangles
	prim.type = primType;

	prim.indexUsage = renderer.BUFFER_STREAM;
	prim.indexBuffer = indices;

	// finally the primitive is created, buffers are generated and the system determines
	// the data it needs to draw this primitive according to the previous definition
	renderer.createPrimitive(prim, vertexCount);

	return prim;
};

ShapePrimitive.getMeshBounds = function( verts,  nVerts )
{
	if (!verts || (nVerts <= 0))  return null;

	var bounds = [verts[0], verts[1], verts[2],  verts[0], verts[1], verts[2]];
	var index = 3;
	for (var i=1;  i<nVerts;  i++)
	{
		var x = verts[index],  y = verts[index+1],  z = verts[index+2];
		index += 3;

		if      (x < bounds[0])  bounds[0] = x;
		else if (x > bounds[3])  bounds[3] = x;
		if      (y < bounds[1])  bounds[1] = y;
		else if (y > bounds[4])  bounds[4] = y;
		if      (z < bounds[2])  bounds[2] = z;
		else if (z > bounds[5])  bounds[5] = z;
	}

	return bounds;
};

ShapePrimitive.getBounds = function( prim )
{
	var verts = prim.bufferStreams[0];
	var nVerts = verts.length;
	var xMin = verts[0],  xMax = verts[0],
		yMin = verts[1],  yMax = verts[1],
		zMin = verts[2],  zMax = verts[2];

	for (var index=3;  index<verts.length;  )
	{
		if (verts[index] < xMin)  xMin = verts[index];
		else if (verts[index] > xMax)  xMax = verts[index];

		index++;
		if (verts[index] < yMin)  yMin = verts[index];
		else if (verts[index] > yMax)  yMax = verts[index];

		index++;
		if (verts[index] < zMin)  zMin = verts[index];
		else if (verts[index] > zMax)  zMax = verts[index];

		index++;
	}

	return [xMin, yMin, zMin,  xMax, yMax, zMax];
};

ShapePrimitive.refineMesh = function( verts, norms, uvs, indices, nVertices,  paramRange,  tolerance )
{
	var oldVrtCount = nVertices;

	// get the param range
	var pUMin = paramRange[0],  pVMin = paramRange[1],
		pUMax = paramRange[2],  pVMax = paramRange[3];
	var iTriangle = 0;
	var nTriangles = indices.length/3;
	var index = 0;
	while (iTriangle < nTriangles)
	{
		// get the indices of the 3 vertices
		var i0 = indices[index],
			i1 = indices[index+1],
			i2 = indices[index+2];

		// get the uv values
		//var vrtIndex = 3*iTriangle;
		var iuv0 = 2 * i0,
			iuv1 = 2 * i1,
			iuv2 = 2 * i2;
		var u0 = uvs[iuv0],  v0 = uvs[iuv0+1],
			u1 = uvs[iuv1],  v1 = uvs[iuv1+1],
			u2 = uvs[iuv2],  v2 = uvs[iuv2+1];

		// find the u and v range
		var uMin = u0,  vMin = v0;
		if (u1 < uMin)  uMin = u1;  if (v1 < vMin)  vMin = v1;
		if (u2 < uMin)  uMin = u2;  if (v2 < vMin)  vMin = v2;
		var uMax = u0,  vMax = v0;
		if (u1 > uMax)  uMax = u1;  if (v1 > vMax)  vMax = v1;
		if (u2 > uMax)  uMax = u2;  if (v2 > vMax)  vMax = v2;

		// if the parameter range of the triangle is outside the
		// desired parameter range, advance to the next polygon and continue
		if ((uMin > pUMax) || (uMax < pUMin) || (vMin > pVMax) || (vMax < pVMin))
		{
			// go to the next triangle
			iTriangle++;
			index += 3;
		}
		else
		{
			// check thesize of the triangle in uv space.  If small enough, advance
			// to the next triangle.  If not small enough, split the triangle into 3;
			var du = uMax - uMin,  dv = vMax - vMin;
			if ((du < tolerance) && (dv < tolerance))
			{
				iTriangle++;
				index += 3;
			}
			else	// split the triangle into 4 parts
			{
				//calculate the position of the new vertex
				var iPt0 = 3 * i0,
					iPt1 = 3 * i1,
					iPt2 = 3 * i2;
				var x0 = verts[iPt0],  y0 = verts[iPt0+1],  z0 = verts[iPt0+2],
					x1 = verts[iPt1],  y1 = verts[iPt1+1],  z1 = verts[iPt1+2],
					x2 = verts[iPt2],  y2 = verts[iPt2+1],  z2 = verts[iPt2+2];
				
				// calculate the midpoints of the edges
				var xA = (x0 + x1)/2.0,  yA = (y0 + y1)/2.0,  zA = (z0 + z1)/2.0,
					xB = (x1 + x2)/2.0,  yB = (y1 + y2)/2.0,  zB = (z1 + z2)/2.0,
					xC = (x2 + x0)/2.0,  yC = (y2 + y0)/2.0,  zC = (z2 + z0)/2.0;

				// calculate the uv values of the new coordinates
				var uA = (u0 + u1)/2.0,  vA = (v0 + v1)/2.0,
					uB = (u1 + u2)/2.0,  vB = (v1 + v2)/2.0,
					uC = (u2 + u0)/2.0,  vC = (v2 + v0)/2.0;

				// calculate the normals for the new points
				var nx0 = norms[iPt0],  ny0 = norms[iPt0+1],  nz0 = norms[iPt0+2],
					nx1 = norms[iPt1],  ny1 = norms[iPt1+1],  nz1 = norms[iPt1+2],
					nx2 = norms[iPt2],  ny2 = norms[iPt2+1],  nz2 = norms[iPt2+2];
				var nxA = (nx0 + nx1),  nyA = (ny0 + ny1),  nzA = (nz0 + nz1);  var nrmA = VecUtils.vecNormalize(3, [nxA, nyA, nzA], 1.0 ),
					nxB = (nx1 + nx2),  nyB = (ny1 + ny2),  nzB = (nz1 + nz2);  var nrmB = VecUtils.vecNormalize(3, [nxB, nyB, nzB], 1.0 ),
					nxC = (nx2 + nx0),  nyC = (ny2 + ny0),  nzC = (nz2 + nz0);  var nrmC = VecUtils.vecNormalize(3, [nxC, nyC, nzC], 1.0 );

				// push everything
				verts.push(xA);  verts.push(yA);  verts.push(zA);
				verts.push(xB);  verts.push(yB);  verts.push(zB);
				verts.push(xC);  verts.push(yC);  verts.push(zC);
				uvs.push(uA),  uvs.push(vA);
				uvs.push(uB),  uvs.push(vB);
				uvs.push(uC),  uvs.push(vC);
				norms.push(nrmA[0]);  norms.push(nrmA[1]);  norms.push(nrmA[2]);
				norms.push(nrmB[0]);  norms.push(nrmB[1]);  norms.push(nrmB[2]);
				norms.push(nrmC[0]);  norms.push(nrmC[1]);  norms.push(nrmC[2]);

				// split the current triangle into 4
				indices[index+1] = nVertices;  indices[index+2] = nVertices+2;
				indices.push(nVertices);    indices.push(i1);           indices.push(nVertices+1);  nTriangles++;
				indices.push(nVertices+1);  indices.push(i2);           indices.push(nVertices+2);  nTriangles++;
				indices.push(nVertices);    indices.push(nVertices+1);  indices.push(nVertices+2);  nTriangles++;
				nVertices += 3;

				// by not advancing 'index', we examine the first of the 3 triangles generated above
			}
		}
	}

	console.log( "refine mesh vertex count " + oldVrtCount  + " => " + nVertices );
	return nVertices;
};


if (typeof exports === "object") {
    exports.ShapePrimitive = ShapePrimitive;
}